const ENGINE_CONTRACT_VERSION="54.1";





let liveSocket=null,liveSymbol=null,lastWsTick=0,liveSocketSeq=0,wsReconnectTimer=null,wsReconnectAttempt=0;
function startLiveSocket(sym){
 const seq=++liveSocketSeq;liveSymbol=sym.toLowerCase();wsReconnectAttempt=0;
 if(wsReconnectTimer){clearTimeout(wsReconnectTimer);wsReconnectTimer=null}
 try{if(liveSocket){liveSocket.onclose=null;liveSocket.close();liveSocket=null}}catch{}
 function connect(){
   if(seq!==liveSocketSeq)return;
   try{
     liveSocket=new WebSocket(`wss://stream.binance.com:9443/ws/${liveSymbol}@ticker`);
     liveSocket.onopen=()=>{if(seq!==liveSocketSeq)return;lastWsTick=Date.now();wsReconnectAttempt=0;$("wsDot")?.classList.add("live");$("wsStatus").classList.remove("wsStale");$("wsStatus").textContent="WS LIVE"};
     liveSocket.onmessage=e=>{if(seq!==liveSocketSeq)return;lastWsTick=Date.now();markFresh("ws");try{const d=JSON.parse(e.data);if(window.__radarState&&window.__radarState.symbol===sym){$("heroPrice").textContent=num(+d.c);$("price").textContent=num(+d.c);$("hero24").textContent=(+d.P>=0?"+":"")+(+d.P).toFixed(2)+"%"}}catch{}};
     liveSocket.onerror=()=>{if(seq===liveSocketSeq){$("wsDot")?.classList.remove("live");$("wsStatus").textContent="WS ERROR"}};
     liveSocket.onclose=()=>{
       if(seq!==liveSocketSeq)return;
       $("wsDot")?.classList.remove("live");$("wsStatus").textContent="WS RETRY";$("wsStatus").classList.add("wsStale");
       wsReconnectAttempt++;perfStats.wsReconnects++;
       const delay=Math.min(30000,1000*Math.pow(2,Math.min(wsReconnectAttempt,5)));
       wsReconnectTimer=setTimeout(connect,delay)
     };
   }catch{
     if(seq===liveSocketSeq){$("wsStatus").textContent="WS N/A";$("wsStatus").classList.add("wsStale")}
   }
 }
 connect()
}
setInterval(()=>{
 if(lastWsTick&&Date.now()-lastWsTick>45000&&$("wsStatus")){$("wsStatus").textContent="WS STALE";$("wsStatus").classList.add("wsStale");$("wsDot")?.classList.remove("live")}
},15000);
function toggleChartFullscreen(){const c=$("chartCard");c.classList.toggle("fullscreenChart");setTimeout(()=>window.__radarState&&draw(window.__radarState.q),50)}
function volumeProfile(j,bins=24){
 const rows=j.slice(-240);if(areVolLipsa(rows))return null;const hi=Math.max(...rows.map(x=>+x[2])),lo=Math.min(...rows.map(x=>+x[3])),step=(hi-lo)/bins||1,vol=Array(bins).fill(0);
 rows.forEach(x=>{const tp=(+x[2]+ +x[3]+ +x[4])/3,idx=Math.max(0,Math.min(bins-1,Math.floor((tp-lo)/step)));vol[idx]+=+x[5]});
 const total=vol.reduce((a,b)=>a+b,0),pocIdx=vol.indexOf(Math.max(...vol)),pairs=vol.map((v,i)=>({i,v})).sort((a,b)=>b.v-a.v);let acc=0,sel=[];
 for(const q of pairs){sel.push(q.i);acc+=q.v;if(acc>=total*.7)break}
 const mid=i=>lo+(i+.5)*step;return {hi,lo,step,vol,poc:mid(pocIdx),val:mid(Math.min(...sel)),vah:mid(Math.max(...sel)),hvn:mid(pocIdx),total}
}
function anchoredVWAP(j,startIdx){if(volLipsaIn(j,startIdx,j.length-1))return null;let pv=0,v=0;for(let i=Math.max(0,startIdx);i<j.length;i++){const x=j[i],tp=(+x[2]+ +x[3]+ +x[4])/3,vol=+x[5];pv+=tp*vol;v+=vol}return v?pv/v:+j[j.length-1][4]}
function renderVolumeProfile(){
 const st=window.__radarState;if(!st)return;const j=st.j,vp=volumeProfile(j),box=$("vpBars");
 if(!vp){box.innerHTML='<div class="emptyState">Volumul lipsește la unele lumânări - profilul de volum nu se poate calcula.</div>';for(const id of ["vpPoc","vpVah","vpVal","vpHvn","avwapLow","avwapHigh","sessionVwap"])if($(id))$(id).textContent="—";return}
 const mx=Math.max(...vp.vol);
 box.innerHTML=vp.vol.map((v,i)=>`<div class="vpRow"><span>${num(vp.lo+(i+.5)*vp.step)}</span><div class="vpTrack"><div class="vpFill" style="width:${mx?100*v/mx:0}%"></div></div><span>${(100*v/vp.total).toFixed(1)}%</span></div>`).join("");
 $("vpPoc").textContent=num(vp.poc);$("vpVah").textContent=num(vp.vah);$("vpVal").textContent=num(vp.val);$("vpHvn").textContent=num(vp.hvn);
 const closes=j.map(x=>+x[4]),last=j.length-1,look=80,sub=closes.slice(Math.max(0,last-look)),loRel=sub.indexOf(Math.min(...sub)),hiRel=sub.indexOf(Math.max(...sub)),base=Math.max(0,last-look);
 $("avwapLow").textContent=numSau(anchoredVWAP(j,base+loRel));$("avwapHigh").textContent=numSau(anchoredVWAP(j,base+hiRel));$("sessionVwap").textContent=numSau(anchoredVWAP(j,Math.max(0,j.length-24)))
}
function calculateRisk(){
 const ss=window.__signalState;if(!ss||ss.tm.direction==="WAIT"){toast("Need an active LONG/SHORT setup","warn");return}
 const capital=Math.max(1,+$("riskCapital").value||0),pct=Math.max(.01,+$("riskPct").value||1),lev=Math.max(1,+$("riskLeverage").value||1),fee=(+$("riskFee").value||.1)/100,entry=(ss.tm.entryLow+ss.tm.entryHigh)/2,dist=Math.abs(entry-ss.tm.stop),riskAmt=capital*pct/100,qty=dist?riskAmt/dist:0,notional=qty*entry,margin=notional/lev,fees=notional*fee*2;
 const unit=assetClass()==="STOCKS"?" USD":" USDT";$("riskAmount").textContent=riskAmt.toFixed(2)+unit;$("positionSize").textContent=qty.toFixed(6);$("notional").textContent=notional.toFixed(2)+unit;$("marginReq").textContent=margin.toFixed(2)+unit;$("riskStopDist").textContent=(dist/entry*100).toFixed(2)+"%";$("riskFees").textContent=fees.toFixed(2)+unit;
 let warn=margin>capital?"Margin exceeds capital":notional>capital*5?"High exposure":fees>riskAmt*.15?"Fees material":"OK";$("riskWarning").textContent=warn;$("riskWarning").className=warn==="OK"?"good":"bad"
}
function signalExplanation(q,hs,mc){
 const hist=hs.h4?hs.h4.up:50,arr=[["Trend",q.trendScore,(q.trendScore-50)*.34],["Momentum",q.momScore,(q.momScore-50)*.27],["Volume",q.volScore,q.volScore===null?0:(q.volScore-50)*.15],["Structure",q.structureScore,(q.structureScore-50)*.24],["MTF",mc.avg,(mc.avg-50)*.20],["Historical (nedovedit)",hist,0],["ADX",q.adx,q.adx>=25?4:0],["CMF",q.cmf,q.cmf===null?0:q.cmf*20]];
 $("explainList").innerHTML=arr.map(([n,v,c])=>`<div class="explainRow"><span>${n}</span><b class="${v==null?"lipsa":""}">${v==null?"—":typeof v==="number"?v.toFixed(1):v}</b><b class="contrib ${c>0?"good":c<0?"bad":"neutral"}">${c>=0?"+":""}${c.toFixed(1)}</b></div>`).join("")
}
function renderLifecycle(){const ss=window.__signalState,steps=["NEW","CONFIRMED","ENTRY","TP1","TP2","TP3","STOP","INVALIDATED"],dir=ss?.sm.direction||"WAIT";let status="NEW";if(dir!=="WAIT")status=ss.sm.edge>=12?"CONFIRMED":"NEW";$("lifecycle").innerHTML=steps.map(x=>`<span class="lifeStep ${x===status?"on":""}">${x}</span>`).join("")}
async function loadDepth(){
 const b=$("depthBids"),a=$("depthAsks");
 if(assetClass()==="STOCKS"){b.innerHTML=a.innerHTML='<div class="emptyState">Crypto order-book depth is not mixed into US stock analysis.</div>';$("depthSpread").textContent=$("depthImbalance").textContent="N/A";return}
 const sym=norm($("symbol").value);b.innerHTML=a.innerHTML="Loading…";
 try{const d=await market(`/depth?symbol=${encodeURIComponent(sym)}&limit=20`),bids=d.bids||[],asks=d.asks||[],bv=bids.slice(0,10).map(x=>(+x[0])*(+x[1])),av=asks.slice(0,10).map(x=>(+x[0])*(+x[1])),bt=bv.reduce((x,y)=>x+y,0),at=av.reduce((x,y)=>x+y,0),mx=Math.max(...bv,...av,1);
 b.innerHTML=bids.slice(0,10).map((x,i)=>`<div class="depthRow"><span>${num(+x[0])}</span><span>${(+x[1]).toFixed(4)}</span></div><div class="depthBar depthBid" style="width:${100*bv[i]/mx}%"></div>`).join("");
 a.innerHTML=asks.slice(0,10).map((x,i)=>`<div class="depthRow"><span>${num(+x[0])}</span><span>${(+x[1]).toFixed(4)}</span></div><div class="depthBar depthAsk" style="width:${100*av[i]/mx}%"></div>`).join("");
 const spread=asks.length&&bids.length?(+asks[0][0]-+bids[0][0])/(+bids[0][0])*100:null,imb=(bt+at)?(bt-at)/(bt+at)*100:0;$("depthSpread").textContent=spread==null?"N/A":spread.toFixed(4)+"%";$("depthImbalance").textContent=(imb>=0?"+":"")+imb.toFixed(1)+"%";$("depthImbalance").className=imb>5?"good":imb<-5?"bad":"neutral"}catch(e){b.innerHTML=a.innerHTML=`<div class="emptyState">Depth unavailable: ${escapeHtml(e.message)}</div>`}
}

// v64 · Market Breadth Intelligence Pro
let marketBreadthV64State=null;
const marketBreadthV64Cache=new Map();
function v64Pct(x){return Number.isFinite(+x)?(+x).toFixed(0)+'%':'—'}
function v64BreadthClass(state){return state==='BULLISH'?'good':state==='BEARISH'?'bad':'neutral'}
function v64BreadthRow(symbol,rows){
 const j=[...(rows||[])].sort((a,b)=>+a[0]-+b[0]);if(j.length<55)return null;const c=j.map(x=>+x[4]),v=j.map(x=>+x[5]||0),n=c.length,last=c.at(-1),prev=c.at(-2),e20=ema(c,20).at(-1),e50=ema(c,50).at(-1),e200=j.length>=200?ema(c,200).at(-1):NaN,rsi=RSI(c,14).at(-1),look=j.slice(-21,-1),priorHigh=Math.max(...look.map(x=>+x[2])),priorLow=Math.min(...look.map(x=>+x[3])),adv=last>prev,ret=prev?last/prev-1:0,vol=volBara(j.at(-1));
 return {symbol,advance:adv,ret,volume:vol,advVolume:vol===null?null:adv?vol:0,decVolume:vol===null?null:adv?0:vol,above20:last>e20,above50:last>e50,above200:Number.isFinite(e200)?last>e200:null,rsiAbove50:Number.isFinite(rsi)?rsi>50:null,newHigh:last>priorHigh,newLow:last<priorLow,last,prev};
}
function v64AggregateBreadth(rows,meta={}){
 const a=(rows||[]).filter(Boolean),n=a.length,total=Math.max(n,+meta.total||n);if(!n)return {ts:Date.now(),state:'UNAVAILABLE',score:NaN,n:0,total,coverage:0,...meta};const pct=fn=>100*a.filter(fn).length/n,participation=pct(x=>x.advance),above20=pct(x=>x.above20),above50=pct(x=>x.above50),a200=a.filter(x=>x.above200!==null),above200=a200.length?100*a200.filter(x=>x.above200).length/a200.length:NaN,momRows=a.filter(x=>x.rsiAbove50!==null),momentum=momRows.length?100*momRows.filter(x=>x.rsiAbove50).length/momRows.length:NaN,cuVol=a.filter(x=>x.volume!=null),volTotal=cuVol.reduce((z,x)=>z+x.volume,0),volume=volTotal?100*cuVol.reduce((z,x)=>z+x.advVolume,0)/volTotal:50,highs=a.filter(x=>x.newHigh).length,lows=a.filter(x=>x.newLow).length,highLow=highs+lows?50+50*(highs-lows)/(highs+lows):50,trendVals=[above20,above50,above200].filter(Number.isFinite),trend=trendVals.length?trendVals.reduce((x,y)=>x+y,0)/trendVals.length:50,score=Math.max(0,Math.min(100,.20*participation+.30*trend+.20*momentum+.18*volume+.12*highLow)),state=score>=65?'BULLISH':score<=35?'BEARISH':'NEUTRAL',coverage=100*n/Math.max(1,total),bench=+meta.benchmarkReturn||0,divergence=bench>=3&&score<45?'BEARISH DIVERGENCE':bench<=-3&&score>55?'BULLISH DIVERGENCE':'NONE',nonBench=a.filter(x=>!['BTC','BTCUSDT','QQQ'].includes(String(x.symbol).toUpperCase())),altParticipation=nonBench.length?100*nonBench.filter(x=>x.advance).length/nonBench.length:participation;
 return {ts:Date.now(),state,score,participation,trend,above20,above50,above200,momentum,volume,highs,lows,highLow,divergence,coverage,n,total,altParticipation,benchmarkReturn:bench,depth:meta.depth||'FAST',market:meta.market||assetClass(),source:meta.source||analysisSource(),universe:meta.universe||'REPRESENTATIVE',rows:a};
}
function v64BreadthFromAnalysisRows(rows,meta={}){
 const a=(rows||[]).filter(x=>Number.isFinite(+x.avg));if(!a.length)return v64AggregateBreadth([],meta);const n=a.length,participation=100*a.filter(x=>x.dir==='BULLISH'||x.signal==='LONG').length/n,bear=100*a.filter(x=>x.dir==='BEARISH'||x.signal==='SHORT').length/n,trend=a.reduce((z,x)=>z+(Number.isFinite(+x.trend)?+x.trend:+x.avg),0)/n,momentum=a.reduce((z,x)=>z+(Number.isFinite(+x.mom)?+x.mom:50),0)/n,volume=a.reduce((z,x)=>z+(Number.isFinite(+x.volume)?+x.volume:50),0)/n,score=Math.max(0,Math.min(100,.30*participation+.30*trend+.20*momentum+.20*volume)),state=score>=65?'BULLISH':score<=35?'BEARISH':'NEUTRAL';return {ts:Date.now(),state,score,participation,trend,above20:NaN,above50:NaN,above200:NaN,momentum,volume,highs:0,lows:0,highLow:50,divergence:'N/A',coverage:100*n/Math.max(n,+meta.total||n),n,total:+meta.total||n,altParticipation:participation,benchmarkReturn:NaN,depth:meta.depth||'SCAN',market:meta.market||assetClass(),source:meta.source||analysisSource(),universe:meta.universe||'SCANNER',proxy:true,bearParticipation:bear};}
function renderMarketBreadthV64(x=marketBreadthV64State){
 if(!x)return null;const set=(id,v)=>{if($(id))$(id).textContent=v};set('breadthState',x.state);if($('breadthState'))$('breadthState').className='breadthState '+v64BreadthClass(x.state);set('breadthScore',Number.isFinite(+x.score)?(+x.score).toFixed(0)+'/100':'—');if($('breadthBar'))$('breadthBar').style.width=(Number.isFinite(+x.score)?Math.max(0,Math.min(100,+x.score)):0)+'%';set('breadthParticipation',v64Pct(x.participation));set('breadthTrend',`${v64Pct(x.above20)} / ${v64Pct(x.above50)} / ${v64Pct(x.above200)}`);set('breadthVolume',v64Pct(x.volume));set('breadthMomentum',v64Pct(x.momentum));set('breadthHighLow',`${x.highs??0}H / ${x.lows??0}L · ${v64Pct(x.highLow)}`);set('breadthDivergence',x.divergence||'NONE');set('breadthCoverage',`${x.n}/${x.total} · ${v64Pct(x.coverage)} · ${x.depth}`);set('breadthAltParticipation',v64Pct(x.altParticipation));set('breadthAltLabel',x.market==='CRYPTO'?'Altcoin participation':'Broad participation');set('breadthSummary',`${x.market==='STOCKS'?'Nasdaq':'Crypto'} · ${x.state} · score ${Number.isFinite(+x.score)?(+x.score).toFixed(0):'—'} · benchmark ${Number.isFinite(+x.benchmarkReturn)?(x.benchmarkReturn>=0?'+':'')+(+x.benchmarkReturn).toFixed(1)+'%':'—'}`);if($('breadthNote'))$('breadthNote').textContent=`${x.universe} · ${x.depth} · ${x.n}/${x.total} valid series. Breadth confirms participation; it is not a standalone trading instruction.`;set('scanBreadthState',x.state);if($('scanBreadthState'))$('scanBreadthState').className=v64BreadthClass(x.state);set('scanBreadthScore',Number.isFinite(+x.score)?(+x.score).toFixed(0)+'/100':'—');set('scanBreadthCoverage',`${x.n}/${x.total}`);if($('ctxBreadth'))$('ctxBreadth').textContent=Number.isFinite(+x.score)?`${x.state} · ${(+x.score).toFixed(0)}/100`:'N/A';return x;
}
async function refreshMarketBreadthV64(force=false,full=false){
 const market=assetClass(),source=analysisSource(),depth=full?'FULL':'FAST',key=`${market}|${source}|${depth}`,cached=marketBreadthV64Cache.get(key);if(!force&&cached&&Date.now()-cached.ts<10*60000){marketBreadthV64State=cached;window.__marketBreadthV64=cached;renderMarketBreadthV64(cached);return cached}if($('breadthState'))$('breadthState').textContent='LOADING';try{let out;if(market==='STOCKS'){const cfg=await stockConfig();if(!cfg?.configured)throw Error('Twelve Data is not configured');const universe=full?NDX_UNIVERSE:NDX_CORE30,series={},chunk=15;for(let i=0;i<universe.length;i+=chunk){const d=await stockBatchSeries(universe.slice(i,i+chunk),'1d',260);Object.assign(series,d)}const rows=[];for(const sym of universe){const j=series[sym]?.rows||series[sym]||[];const r=v64BreadthRow(sym,j);if(r)rows.push(r)}let qqq=series.QQQ?.rows||series.QQQ||[];if(!qqq.length)qqq=await stockSeries('QQQ','1d',260);const bc=qqq.length>20?(+qqq.at(-1)[4]/+qqq.at(-21)[4]-1)*100:NaN;out=v64AggregateBreadth(rows,{market,source:'TWELVEDATA',total:universe.length,depth,universe:full?'NASDAQ-100 FULL':'NASDAQ CORE30 REPRESENTATIVE',benchmarkReturn:bc})}else{const all=await pionexTop100(),universe=(full?all:all.slice(0,24)),worker=async item=>{try{return v64BreadthRow(String(item.base).toUpperCase(),await analysisKlines(`${String(item.base).toUpperCase()}USDT`,'1d',260,'BINANCE'))}catch{return null}},run=await runPool(universe,worker,4,()=>{}, {cancelled:false}),rows=run.results.filter(Boolean);let btc=rows.find(x=>x.symbol==='BTC'),bc=btc&&btc.prev?(btc.last/btc.prev-1)*100:NaN;out=v64AggregateBreadth(rows,{market,source:'BINANCE',total:universe.length,depth,universe:full?'PIONEX TOP100 / BINANCE DAILY':'PIONEX TOP24 / BINANCE DAILY',benchmarkReturn:bc})}marketBreadthV64State=out;window.__marketBreadthV64=out;marketBreadthV64Cache.set(key,out);renderMarketBreadthV64(out);localDbPutRecord('market_breadth_v64',`${market}|${source}|${depth}|${Math.floor(Date.now()/600000)}`,out,out.ts).catch(()=>{});if(force&&window.__radarState)renderMasterVerdict();return out}catch(e){const proxy=v64BreadthFromAnalysisRows(scannerRows?.length?scannerRows:marketCache.rows,{market,source,total:(scannerRows?.length||marketCache.rows?.length||0),depth:'PROXY',universe:'AVAILABLE SCANNER/MARKET PROXY'});proxy.error=e.message;marketBreadthV64State=proxy;window.__marketBreadthV64=proxy;renderMarketBreadthV64(proxy);if($('breadthNote'))$('breadthNote').textContent=`Full breadth unavailable: ${e.message}. Showing explicit proxy from currently available scanner/overview rows.`;return proxy}}
function v64BreadthAlignment(direction,b=window.__marketBreadthV64){if(!b||!Number.isFinite(+b.score))return 0;const bias=(+b.score-50)/50;return direction==='LONG'||direction==='BULLISH'?bias:direction==='SHORT'||direction==='BEARISH'?-bias:0}
function v64ForwardBreadthStats(rows){const tagged=(rows||[]).filter(x=>Number.isFinite(metricR(x))&&x.breadthState),pack=s=>statPack(tagged.filter(x=>x.breadthState===s).map(metricR));return {n:tagged.length,bull:pack('BULLISH'),neutral:pack('NEUTRAL'),bear:pack('BEARISH')}}

async function loadMarketContext(){try{
 const src=analysisSource(),rows=marketCache.rows||[];
 if(assetClass()==="STOCKS"){
   const [qqq,spy]=await Promise.all([analysisTicker("QQQ",src),analysisTicker("SPY",src)]);
   $("ctxBtc").textContent="QQQ "+pctText(+qqq.priceChangePercent);$("ctxEthBtc").textContent="SPY "+pctText(+spy.priceChangePercent);
 }else{
   const [btc,eth]=await Promise.all([analysisTicker("BTCUSDT",src),analysisTicker("ETHUSDT",src)]),bc=+btc.priceChangePercent/100,ec=+eth.priceChangePercent/100,ethBtcRel=((1+ec)/(1+bc)-1)*100;
   $("ctxBtc").textContent=(bc>=0?"+":"")+(bc*100).toFixed(2)+"%";$("ctxEthBtc").textContent=(ethBtcRel>=0?"+":"")+ethBtcRel.toFixed(2)+"%"
 }
 let bull=rows.filter(x=>x.ver==="BULLISH").length,bear=rows.filter(x=>x.ver==="BEARISH").length;$("ctxBreadth").textContent=window.__marketBreadthV64&&Number.isFinite(+window.__marketBreadthV64.score)?`${window.__marketBreadthV64.state} · ${(+window.__marketBreadthV64.score).toFixed(0)}/100`:(rows.length?`${bull}B / ${bear}S`:"N/A");$("ctxRegime").textContent=window.__radarState?.q?.regime||"—"
}catch{$("ctxBtc").textContent=$("ctxEthBtc").textContent="N/A"}}
async function checkPionexHealth(){
  if(!$("healthPionex"))return;
  const cool=pionexCooldownRemaining();
  if($("healthPionexCooldown"))$("healthPionexCooldown").textContent=cool?`${Math.ceil(cool/1000)}s`:"READY";if($("healthPionexStrikes"))$("healthPionexStrikes").textContent=String(pionexRateStrikes);if($("healthPionexPacing"))$("healthPionexPacing").textContent=`SAFE · ${(PIONEX_MIN_INTERVAL_MS/1000).toFixed(2)}s`;
  if(cool){$("healthPionex").textContent="RATE LIMITED";return}
  $("healthPionex").textContent="Checking…";
  try{
    const d=await pionexRequest("/api/v1/market/tickers?symbol=BTC_USDT","pionex_tickers","&symbol=BTC_USDT");
    $("healthPionex").textContent=d&&d.result!==false?"OK":"ERROR";
    if($("healthPionexCooldown"))$("healthPionexCooldown").textContent="READY"
  }catch(e){$("healthPionex").textContent="FAIL · "+e.message}
}
async function runHealthCheck(){checkPionexHealth().catch(()=>{});checkStocksHealth().catch(()=>{});loadCloudMonitor(false).catch(()=>{});runProviderHealthV62(false).catch(()=>{});intelApi("config").then(()=>{if($("healthIntel"))$("healthIntel").textContent="OK"}).catch(()=>{if($("healthIntel"))$("healthIntel").textContent="FAIL"});$("healthSpot").textContent="Checking…";try{await analysisTicker(assetClass()==="STOCKS"?"AAPL":"BTCUSDT",analysisSource());$("healthSpot").textContent=analysisSource()+" OK"}catch{$("healthSpot").textContent=analysisSource()+" FAIL"}$("healthWs").textContent=lastWsTick&&Date.now()-lastWsTick<60000?"LIVE":"OFF";$("healthFut").textContent=window.__derivativesState&&Object.values(window.__derivativesState).some(x=>x!=null)?"OK":"OPTIONAL";$("healthSent").textContent=$("fearGreed")&&$("fearGreed").textContent!=="N/A"?"OK":"OPTIONAL";$("healthJournal").textContent=journal().length+" signals";$("healthPwa").textContent=("serviceWorker" in navigator)?"READY":"UNSUPPORTED";
 if($("healthCache"))$("healthCache").textContent=`${requestCache.size} items · ${perfStats.cacheHits} hits`;
 if($("healthInflight"))$("healthInflight").textContent=`${requestInflight.size} active · ${perfStats.inflightHits} deduped`;
 if($("healthScanner"))$("healthScanner").textContent=perfStats.lastScanner;
 if($("healthReconnects"))$("healthReconnects").textContent=perfStats.wsReconnects;renderPwaHealth()}

function v62AgeState(ts,goodMs,warnMs){const age=ts?Date.now()-Number(ts):Infinity;return {age,state:age<=goodMs?'OK':age<=warnMs?'STALE':'FAIL'}}
function v62LocalIntegritySnapshot(){
  const st=window.__radarState||null,matrix=window.__dataQualityMatrix||null,market=assetClass(),idOk=!!(st&&decisionIdentityKey(currentDecisionIdentity(st.symbol,st.source,st.tf))===activeDecisionIdentityKey),rest=v62AgeState(dataFresh.rest,120000,300000),live=v62AgeState(lastWsTick,60000,180000),mtf=Number(matrix?.mtfCoverage??0),quality=Number.isFinite(+matrix?.score)?+matrix.score:(st?masterDataQuality():0),rows=[
    {name:'Primary REST',state:rest.state,detail:rest.age<Infinity?ageText(Date.now()-rest.age):'no sample'},
    {name:market==='STOCKS'?'Quote poll':'Live WS',state:live.state,detail:live.age<Infinity?ageText(Date.now()-live.age):'no sample'},
    {name:'Decision identity',state:idOk?'OK':'FAIL',detail:idOk?'market/source/symbol/TF aligned':'missing or mismatched'},
    {name:'MTF coverage',state:mtf>=.75?'OK':mtf>=.5?'STALE':'FAIL',detail:`${Math.round(mtf*100)}%`},
    {name:'Master data quality',state:quality>=80?'OK':quality>=65?'STALE':'FAIL',detail:`${quality.toFixed(0)}/100`}
  ];
  // v74.6: inainte de ORICE analiza, verificarile locale nu au ce masura. Asta
  // e "neincercat", nu "picat" - altfel Health scria FAIL 46/100 la pornire si
  // watchdog-ul intra in SAFE MODE HARD fara nicio problema reala.
  // Identitatea, MTF si calitatea tin de o ANALIZA; REST/WS doar de mostra lor.
  if(!st)for(const x of rows.slice(2)){x.state='NEÎNCERCAT';x.detail='nicio analiză rulată încă'}
  if(rest.age===Infinity){rows[0].state='NEÎNCERCAT'}if(live.age===Infinity){rows[1].state='NEÎNCERCAT'}
  const masurate=rows.filter(x=>x.state!=='NEÎNCERCAT');
  const score=masurate.length?masurate.reduce((a,x)=>a+(x.state==='OK'?100:x.state==='STALE'?55:10),0)/masurate.length:null;return {ts:Date.now(),market,symbol:st?.symbol||null,source:st?.source||analysisSource(),score,quality,rows,neincercat:!masurate.length}
}
function v62ProviderStateClass(state){return state==='OK'?'good':state==='DEGRADED'||state==='CONFIGURED'||state==='STALE'||state==='NEÎNCERCAT'?'neutral':'bad'}
async function runProviderHealthV62(deep=true){
  const status=$('providerHealthStatus'),table=$('providerHealthTable');if(status)status.textContent='Checking providers…';if(table)table.innerHTML='<div class="emptyState">Running server + local integrity probes…</div>';
  let server=null,error=null;try{server=await getJSON(`/api/provider-health?deep=${deep?1:0}`)}catch(e){error=e.message}
  const local=v62LocalIntegritySnapshot(),providers=server?.providers||[],required=providers.filter(x=>x.required!==false),ok=required.filter(x=>x.state==='OK'||x.state==='CONFIGURED').length,providerScore=required.length?100*ok/required.length:0,combined=Math.round(local.score===null?providerScore:.55*providerScore+.45*local.score),state=error?'DEGRADED':local.neincercat?'NEÎNCERCAT':combined>=85?'OK':combined>=65?'DEGRADED':'FAIL',snapshot={ts:Date.now(),state,score:state==='NEÎNCERCAT'?null:combined,providerScore,server,local,error};window.__providerHealthV62=snapshot;
  if($('providerHealthScore'))$('providerHealthScore').textContent=state==='NEÎNCERCAT'?'—':`${combined}/100`;if($('providerHealthOverall')){$('providerHealthOverall').textContent=state;$('providerHealthOverall').className=v62ProviderStateClass(state)}if($('providerHealthLocal'))$('providerHealthLocal').textContent=local.score===null?'NEÎNCERCAT':`${local.score.toFixed(0)}/100`;if($('providerHealthRequired'))$('providerHealthRequired').textContent=`${ok}/${required.length}`;
  if(table){const all=[...providers,...local.rows.map(x=>({name:'LOCAL · '+x.name,state:x.state,latencyMs:null,detail:x.detail,configured:true}))];table.innerHTML=all.length?`<div class="providerHealthRow providerHealthHead"><div>Provider / check</div><div>State</div><div>Latency</div><div>Detail</div></div>`+all.map(x=>`<div class="providerHealthRow"><div><b>${escapeHtml(x.name||'—')}</b></div><div class="${v62ProviderStateClass(x.state)}">${escapeHtml(x.state||'—')}</div><div>${Number.isFinite(+x.latencyMs)?Math.round(+x.latencyMs)+' ms':'—'}</div><div>${escapeHtml(x.detail||x.error||'—')}</div></div>`).join(''):'<div class="emptyState">No provider checks returned.</div>'}
  if(status)status.textContent=`${state} · ${state==='NEÎNCERCAT'?'—':combined+'/100'} · ${new Date().toLocaleTimeString()}`;await localDbPutRecord('provider_health_v62',String(Math.floor(Date.now()/300000)),snapshot,Date.now());return snapshot
}
function exportProviderHealthV62(){const x=window.__providerHealthV62;if(!x)return toast('Run Provider Health first','warn');downloadTextFile(`crypto-radar-v66-provider-health-${Date.now()}.json`,JSON.stringify(x,null,2),'application/json')}


function pctRank(arr,v){if(!arr.length)return 50;let n=arr.filter(x=>x<=v).length;return 100*n/arr.length}

let volatilityIntelligenceState=null;

function vol53BarsPerYear(tf,market=assetClass()){
  const crypto={"15m":365*96,"1h":365*24,"4h":365*6,"1d":365},stocks={"15m":252*26,"1h":252*6.5,"4h":252*2,"1d":252};return +(market==="STOCKS"?stocks[tf]:crypto[tf])||365
}
function vol53YearDays(market=assetClass()){return market==="STOCKS"?252:365}
function vol53ObservedBarsPerYear(j,tf,market=assetClass()){
  if(market!=="STOCKS"||tf==="1d")return vol53BarsPerYear(tf,market);const ds=[];for(let i=1;i<(j||[]).length;i++){const h=(+j[i][0]-+j[i-1][0])/3600000;if(h>0&&h<=8)ds.push(h)}const med=vol53Quantile(ds,.5);return Number.isFinite(med)&&med>0?252*6.5/med:vol53BarsPerYear(tf,market)
}
function vol53LogReturns(j){const r=[];for(let i=1;i<(j||[]).length;i++){const a=+j[i-1][4],b=+j[i][4];if(a>0&&b>0)r.push(Math.log(b/a))}return r}
function vol53Std(a){const x=(a||[]).filter(Number.isFinite);if(x.length<2)return NaN;const m=x.reduce((u,v)=>u+v,0)/x.length;return Math.sqrt(x.reduce((u,v)=>u+(v-m)**2,0)/(x.length-1))}
function vol53AnnualizedFromReturns(r,barsPerYear){const sd=vol53Std(r);return Number.isFinite(sd)?sd*Math.sqrt(barsPerYear)*100:NaN}
function vol53AnnualizedRv(j,n,tf,market=assetClass()){const r=vol53LogReturns(j);if(r.length<n)return NaN;return vol53AnnualizedFromReturns(r.slice(-n),vol53ObservedBarsPerYear(j,tf,market))}
function vol53RollingRvSeries(j,n,tf,market=assetClass(),look=360){
  const r=vol53LogReturns(j),bpy=vol53ObservedBarsPerYear(j,tf,market),out=[],start=Math.max(n,r.length-look);for(let end=start;end<=r.length;end++){if(end<n)continue;const v=vol53AnnualizedFromReturns(r.slice(end-n,end),bpy);if(Number.isFinite(v))out.push(v)}return out
}
function vol53NonOverlapRvSeries(j,n,tf,market=assetClass(),look=400){
  const r=vol53LogReturns(j),bpy=vol53ObservedBarsPerYear(j,tf,market),out=[],start=Math.max(0,r.length-look);for(let end=r.length;end-n>=start;end-=n){const v=vol53AnnualizedFromReturns(r.slice(end-n,end),bpy);if(Number.isFinite(v))out.unshift(v)}return out
}
function vol53Quantile(a,p){const x=(a||[]).filter(Number.isFinite).sort((u,v)=>u-v);if(!x.length)return NaN;const i=(x.length-1)*p,l=Math.floor(i),h=Math.ceil(i);return l===h?x[l]:x[l]+(x[h]-x[l])*(i-l)}
function vol53Percentile(a,v){const x=(a||[]).filter(Number.isFinite);if(!x.length||!Number.isFinite(v))return NaN;return x.filter(z=>z<=v).length/x.length*100}
function vol53Cone(j,tf,market=assetClass()){
  return [10,20,60,120].map(n=>{const series=vol53RollingRvSeries(j,n,tf,market,400),nonOverlap=vol53NonOverlapRvSeries(j,n,tf,market,480),cur=series.at(-1);return {window:n,n:series.length,nonOverlapN:nonOverlap.length,current:cur,percentile:vol53Percentile(series,cur),nonOverlapPercentile:vol53Percentile(nonOverlap,cur),p10:vol53Quantile(series,.10),p25:vol53Quantile(series,.25),p50:vol53Quantile(series,.50),p75:vol53Quantile(series,.75),p90:vol53Quantile(series,.90)}}).filter(x=>Number.isFinite(x.current))
}
function vol53AnnualizedRangeEstimators(j,tf,market=assetClass(),n=20){
  const a=(j||[]).slice(-n),bpy=vol53ObservedBarsPerYear(j,tf,market),p=[],g=[];for(const x of a){const o=+x[1],h=+x[2],l=+x[3],c=+x[4];if(h>0&&l>0)p.push(Math.log(h/l)**2/(4*Math.log(2)));if(o>0&&h>0&&l>0&&c>0)g.push(Math.max(0,.5*Math.log(h/l)**2-(2*Math.log(2)-1)*Math.log(c/o)**2))}const pv=p.length?p.reduce((u,v)=>u+v,0)/p.length:NaN,gv=g.length?g.reduce((u,v)=>u+v,0)/g.length:NaN;return {parkinson:Number.isFinite(pv)?Math.sqrt(pv*bpy)*100:NaN,garmanKlass:Number.isFinite(gv)?Math.sqrt(gv*bpy)*100:NaN}
}
function vol54StockGapDiagnostics(j,tf,market=assetClass()){
  if(market!=="STOCKS"||tf!=="1d"||!j?.length)return {available:false,overnight:NaN,intraday:NaN,total:NaN};const on=[],intra=[];for(let i=1;i<j.length;i++){const pc=+j[i-1][4],o=+j[i][1],c=+j[i][4];if(pc>0&&o>0)on.push(Math.log(o/pc));if(o>0&&c>0)intra.push(Math.log(c/o))}return {available:on.length>5,overnight:vol53AnnualizedFromReturns(on,252),intraday:vol53AnnualizedFromReturns(intra,252),total:vol53AnnualizedRv(j,Math.min(20,j.length-1),tf,market)}
}
function vol53BbDiagnostics(j,n=20,look=180){const c=(j||[]).map(x=>+x[4]),ma=sma(c,n),sd=stddev(c,n),series=[];for(let i=n-1;i<c.length;i++)if(Number.isFinite(ma[i])&&ma[i]>0&&Number.isFinite(sd[i]))series.push(4*sd[i]/ma[i]*100);const x=series.slice(-look),cur=x.at(-1),prev=x.length>10?x.at(-11):NaN;return {value:cur,percentile:vol53Percentile(x,cur),change10:Number.isFinite(cur)&&Number.isFinite(prev)&&prev>0?cur/prev-1:NaN,series:x}}
function vol53AtrDiagnostics(j,n=14,look=180){const c=(j||[]).map(x=>+x[4]),h=(j||[]).map(x=>+x[2]),l=(j||[]).map(x=>+x[3]),a=ATR(h,l,c,n).map((x,i)=>c[i]>0?x/c[i]*100:NaN).filter(Number.isFinite).slice(-look),cur=a.at(-1);return {value:cur,percentile:vol53Percentile(a,cur),series:a}}
function vol53Semivol(j,tf,market=assetClass(),n=60){const r=vol53LogReturns(j).slice(-n),bpy=vol53ObservedBarsPerYear(j,tf,market),down=r.filter(x=>x<0),up=r.filter(x=>x>0),d=down.length?Math.sqrt(down.reduce((a,x)=>a+x*x,0)/down.length*bpy)*100:0,u=up.length?Math.sqrt(up.reduce((a,x)=>a+x*x,0)/up.length*bpy)*100:0;return {down:d,up:u,ratio:u>0?d/u:NaN}}
function vol53Clustering(j,n=180){const r=vol53LogReturns(j).slice(-n),sq=r.map(x=>x*x);if(sq.length<12)return NaN;return corr(sq.slice(0,-1),sq.slice(1))}
function vol53ShockStats(j,n=180){const r=vol53LogReturns(j).slice(-n),sd=vol53Std(r);if(!Number.isFinite(sd)||sd<=0)return {n:r.length,sigma2:0,sigma3:0};return {n:r.length,sigma2:r.filter(x=>Math.abs(x)>=2*sd).length,sigma3:r.filter(x=>Math.abs(x)>=3*sd).length}}
function vol53VolOfVol(j,tf,market=assetClass()){const a=vol53RollingRvSeries(j,20,tf,market,160);if(a.length<10)return {value:NaN,mean:NaN,sd:NaN};const mean=a.reduce((u,v)=>u+v,0)/a.length,sd=vol53Std(a);return {value:mean>0?sd/mean*100:NaN,mean,sd}}
function vol53ExpectedMove(price,annVol,days,market=assetClass()){if(!(price>0)||!Number.isFinite(annVol))return NaN;return price*(annVol/100)*Math.sqrt(days/vol53YearDays(market))}
function vol54IvForDays(term,target){
  const a=(term||[]).filter(x=>Number.isFinite(+x.atmIv)&&+x.days>0).sort((x,y)=>+x.days-+y.days);if(!a.length)return {iv:NaN,method:"UNAVAILABLE"};const t=+target;
  if(t<a[0].days){if(a[0].days-t>3)return {iv:NaN,method:"NO_SHORT_HORIZON"};return {iv:+a[0].atmIv,method:"NEAREST_SHORT",from:[a[0].days]}}
  if(t>a.at(-1).days){if(t-a.at(-1).days>7)return {iv:NaN,method:"NO_LONG_HORIZON"};return {iv:+a.at(-1).atmIv,method:"NEAREST_LONG",from:[a.at(-1).days]}}
  const exact=a.find(x=>Math.abs(+x.days-t)<1e-9);if(exact)return {iv:+exact.atmIv,method:"EXACT",from:[+exact.days]};let lo=a[0],hi=a.at(-1);for(let i=1;i<a.length;i++)if(+a[i].days>=t){lo=a[i-1];hi=a[i];break}const T1=+lo.days/365,T2=+hi.days/365,T=t/365,w=(T-T1)/(T2-T1),v1=(+lo.atmIv/100)**2*T1,v2=(+hi.atmIv/100)**2*T2,total=v1+(v2-v1)*w,iv=Math.sqrt(Math.max(0,total/T))*100;return {iv,method:"TOTAL_VARIANCE_INTERP",from:[+lo.days,+hi.days]}
}
function vol53ImpliedDiagnostics(j,tf,rv20,price,market=assetClass()){
  const o=externalIntelState?.options;if(market!=="CRYPTO"||!o?.available||!o.termStructure?.length)return {available:false,iv:NaN,ratio:NaN,slope:NaN,premium:"N/A",expiry:null,move1d:NaN,move7d:NaN,term:[],matchedRv:NaN,matchedDays:NaN,matchedBars:0,iv1d:NaN,iv7d:NaN};
  const term=o.termStructure.filter(x=>Number.isFinite(+x.atmIv)&&+x.days>0).sort((a,b)=>+a.days-+b.days),near=term[0],far=term.length>1?term[Math.min(term.length-1,3)]:near,iv=+near?.atmIv,barsPerDay=vol53ObservedBarsPerYear(j,tf,market)/vol53YearDays(market),matchedDays=Math.max(1,+near?.days||1),matchedBars=Math.max(5,Math.round(matchedDays*barsPerDay)),matchedRv=matchedBars<=vol53LogReturns(j).length?vol53AnnualizedRv(j,matchedBars,tf,market):NaN,ratio=Number.isFinite(matchedRv)&&matchedRv>0?iv/matchedRv:NaN,slope=near&&far&&far!==near?(+far.atmIv-iv):0,premium=Number.isFinite(ratio)?ratio>=1.25?"IV PREMIUM":ratio<=.80?"REALIZED > IMPLIED":"BALANCED":"N/A",d1=vol54IvForDays(term,1),d7=vol54IvForDays(term,7);
  return {available:Number.isFinite(iv),iv,ratio,slope,premium,expiry:near?.expiry||null,move1d:Number.isFinite(d1.iv)?vol53ExpectedMove(price,d1.iv,1,market):NaN,move7d:Number.isFinite(d7.iv)?vol53ExpectedMove(price,d7.iv,7,market):NaN,iv1d:d1.iv,iv7d:d7.iv,iv1dMethod:d1.method,iv7dMethod:d7.method,term,matchedRv,matchedDays,matchedBars,ivProxy:"ATM_BAND_MEDIAN"}
}
function vol53MtfMap(m){
  return (m||[]).map(x=>{const pct=Number(x.rvPercentile),atr=Number(x.atrPct),state=Number.isFinite(pct)?pct>=85?"EXTREME":pct>=70?"ELEVATED":pct<=25?"COMPRESSED":"NORMAL":"N/A";return {tf:x.tf,rvPercentile:pct,atrPct:atr,ttm:x.ttm?.state||"—",state,parkVol:Number(x.parkVol),gkVol:Number(x.gkVol)}})
}
function vol53BuildState(st=window.__radarState){
  if(!st?.j?.length||!st.q)return null;const j=st.j,q=st.q,tf=st.tf||$("tf")?.value||"4h",market=assetClass(),price=+q.price,rv10=vol53AnnualizedRv(j,10,tf,market),rv20=vol53AnnualizedRv(j,20,tf,market),rv60=vol53AnnualizedRv(j,60,tf,market),cone=vol53Cone(j,tf,market),rv20row=cone.find(x=>x.window===20),rvPct=Number.isFinite(rv20row?.percentile)?rv20row.percentile:Number(q.rvPercentile),atr=vol53AtrDiagnostics(j),bb=vol53BbDiagnostics(j),ranges=vol53AnnualizedRangeEstimators(j,tf,market,20),vov=vol53VolOfVol(j,tf,market),semi=vol53Semivol(j,tf,market),cluster=vol53Clustering(j),shocks=vol53ShockStats(j),rvAccel=Number.isFinite(rv10)&&Number.isFinite(rv20)&&rv20>0?rv10/rv20-1:0,rvRatio=Number.isFinite(rv10)&&Number.isFinite(rv60)&&rv60>0?rv10/rv60:NaN,ttm=q.ttm?.state||"SQUEEZE OFF";
  let expansion=.34*(Number.isFinite(rvPct)?rvPct:50)+.26*(Number.isFinite(atr.percentile)?atr.percentile:50)+.25*(Number.isFinite(bb.percentile)?bb.percentile:50)+.15*clamp(50+rvAccel*180,0,100),compression=.38*(100-(Number.isFinite(rvPct)?rvPct:50))+.31*(100-(Number.isFinite(atr.percentile)?atr.percentile:50))+.31*(100-(Number.isFinite(bb.percentile)?bb.percentile:50));
  if(ttm==="SQUEEZE ON")compression=Math.min(100,compression+10);const expandingNow=(rvAccel>.08)||(Number.isFinite(bb.change10)&&bb.change10>.08);
  let regime="NORMAL",alert="NO ALERT";if(rvPct>=92||expansion>=86){regime="EXTREME";alert="EXTREME VOL"}else if((ttm==="SQUEEZE ON"||compression>=70)&&expandingNow){regime="BREAKOUT TRANSITION";alert="BREAKOUT WATCH"}else if(compression>=70){regime="COMPRESSION";alert="SQUEEZE / COMPRESSION"}else if(expansion>=65){regime="EXPANSION";alert="VOL EXPANSION"}
  const riskMultiplier=regime==="EXTREME"?.50:regime==="BREAKOUT TRANSITION"?.65:regime==="EXPANSION"?.78:regime==="COMPRESSION"?.90:1,implied=vol53ImpliedDiagnostics(j,tf,rv20,price,market),gapVol=vol54StockGapDiagnostics(j,tf,market),move1d=vol53ExpectedMove(price,rv20,1,market),move7d=vol53ExpectedMove(price,rv20,7,market),mtf=vol53MtfMap(st.m),mtfHigh=mtf.filter(x=>x.state==="EXTREME"||x.state==="ELEVATED").length;
  return {ts:Date.now(),market,symbol:st.symbol,tf,source:st.source||analysisSource(),price,regime,alert,expansion:clamp(expansion),compression:clamp(compression),riskMultiplier,rv10,rv20,rv60,rvPct,rvAccel,rvRatio,atr,bb,ranges,gapVol,vov,semi,cluster,shocks,ttm,cone,implied,move1d,move7d,mtf,mtfHigh}
}
function vol53Fmt(v,d=1,suffix="%"){return Number.isFinite(+v)?(+v).toFixed(d)+suffix:"—"}
function saveVolatilityRiskPolicy(enabled){const x=appSettings();x.enableExperimentalVolRisk=!!enabled;localStorage.setItem("radarSettings",JSON.stringify(x));renderVolatilityIntelligence(false);toast(`Experimental volatility sizing ${enabled?"enabled":"disabled"}`,enabled?"warn":"good")}
function vol53Class(state){
  return state==="EXTREME"||state==="BREAKOUT TRANSITION"?"volBad":state==="EXPANSION"?"volWarn":state==="COMPRESSION"?"volGood":"volNeutral"
}
function renderVolatilityIntelligence(showToast=false){
  const x=vol53BuildState();volatilityIntelligenceState=x;window.__volatilityIntel=x;if(!x){if(showToast)toast("Run analysis first.","warn");return null}
  if(!$("vol53State"))return x;
  if($("vol54EnableRisk"))$("vol54EnableRisk").checked=!!appSettings().enableExperimentalVolRisk;$("vol53State").textContent=x.regime;$("vol53State").className="volStateBig "+vol53Class(x.regime);$("vol53Alert").textContent=x.alert;$("vol53Alert").className="volStateBig "+vol53Class(x.regime);$("vol53Expansion").textContent=x.expansion.toFixed(0)+"/100";$("vol53Compression").textContent=x.compression.toFixed(0)+"/100";$("vol53RiskMult").textContent=`${x.riskMultiplier.toFixed(2)}× · ${appSettings().enableExperimentalVolRisk?"ENABLED":"RESEARCH ONLY"}`;$("vol53ExpansionBar").style.width=x.expansion.toFixed(0)+"%";
  $("vol53Narrative").textContent=`${x.symbol} · ${x.tf} · ${x.regime}. RV20 percentile ${Number.isFinite(x.rvPct)?x.rvPct.toFixed(0)+"%":"N/A"}; ${x.mtfHigh}/${x.mtf.length||0} MTFs elevated/extreme. ${x.ttm}. Volatility is direction-neutral; this layer adjusts risk and breakout awareness, not LONG/SHORT direction.`;
  $("vol53Atr").textContent=`${vol53Fmt(x.atr.value,2)} · p${Number.isFinite(x.atr.percentile)?x.atr.percentile.toFixed(0):"—"}`;$("vol53Bbw").textContent=`${vol53Fmt(x.bb.percentile,0)} · Δ10 ${Number.isFinite(x.bb.change10)?(x.bb.change10*100).toFixed(0)+"%":"—"}`;$("vol53Rv20").textContent=vol53Fmt(x.rv20,1);$("vol53RvPct").textContent=vol53Fmt(x.rvPct,0);$("vol53RvRatio").textContent=Number.isFinite(x.rvRatio)?x.rvRatio.toFixed(2)+"×":"—";$("vol53VolOfVol").textContent=vol53Fmt(x.vov.value,1);$("vol53Park").textContent=vol53Fmt(x.ranges.parkinson,1);$("vol53Gk").textContent=vol53Fmt(x.ranges.garmanKlass,1);$("vol53Semi").textContent=`${vol53Fmt(x.semi.down,1)} / ${vol53Fmt(x.semi.up,1)}${Number.isFinite(x.semi.ratio)?" · "+x.semi.ratio.toFixed(2)+"×":""}`;$("vol53Cluster").textContent=Number.isFinite(x.cluster)?x.cluster.toFixed(2):"—";$("vol53Shocks").textContent=`${x.shocks.sigma2} / ${x.shocks.sigma3} of ${x.shocks.n}`;$("vol53Ttm").textContent=x.ttm;if($("vol54GapVol"))$("vol54GapVol").textContent=x.gapVol?.available?`${vol53Fmt(x.gapVol.overnight,1)} / ${vol53Fmt(x.gapVol.intraday,1)}`:"N/A";
  $("vol53ConeTable").innerHTML=`<div class="volRow"><div class="volCell">Window</div><div class="volCell">Current</div><div class="volCell">Overlap pct</div><div class="volCell">Non-overlap pct</div><div class="volCell">P10</div><div class="volCell">Median</div><div class="volCell">P90</div></div>`+x.cone.map(r=>`<div class="volRow"><div class="volCell">${r.window} bars</div><div class="volCell">${vol53Fmt(r.current,1)}</div><div class="volCell">${vol53Fmt(r.percentile,0)}</div><div class="volCell">${vol53Fmt(r.nonOverlapPercentile,0)} · N${r.nonOverlapN}</div><div class="volCell">${vol53Fmt(r.p10,1)}</div><div class="volCell">${vol53Fmt(r.p50,1)}</div><div class="volCell">${vol53Fmt(r.p90,1)}</div></div>`).join("");
  const iv=x.implied;$("vol53Realized").textContent=Number.isFinite(iv.matchedRv)?`${vol53Fmt(iv.matchedRv,1)} · ${iv.matchedBars} bars`:`${vol53Fmt(x.rv20,1)} (RV20)`;$("vol53Implied").textContent=iv.available?`${vol53Fmt(iv.iv,1)} · ATM-band proxy`:"N/A";$("vol53IvRv").textContent=Number.isFinite(iv.ratio)?iv.ratio.toFixed(2)+"×":"—";$("vol53IvSlope").textContent=Number.isFinite(iv.slope)?`${iv.slope>=0?"+":""}${iv.slope.toFixed(1)} vol`:"—";$("vol53Premium").textContent=iv.premium;$("vol53Expiry").textContent=iv.expiry?new Date(iv.expiry).toLocaleDateString():"—";
  $("vol53IvTable").innerHTML=iv.available&&iv.term.length?`<div class="volRow"><div class="volCell">Expiry</div><div class="volCell">Days</div><div class="volCell">ATM IV</div><div class="volCell">Put wing</div><div class="volCell">Call wing</div><div class="volCell">Skew</div><div class="volCell">Put/Call OI</div></div>`+iv.term.slice(0,8).map(r=>`<div class="volRow"><div class="volCell">${new Date(r.expiry).toLocaleDateString()}</div><div class="volCell">${(+r.days).toFixed(1)}</div><div class="volCell">${vol53Fmt(r.atmIv,1)}</div><div class="volCell">${vol53Fmt(r.putWingIv,1)}</div><div class="volCell">${vol53Fmt(r.callWingIv,1)}</div><div class="volCell">${Number.isFinite(+r.skewProxy)?(+r.skewProxy).toFixed(1):"—"}</div><div class="volCell">${Number.isFinite(+r.callOi)&&+r.callOi>0?(+r.putOi/+r.callOi).toFixed(2):"—"}</div></div>`).join(""):'<div class="emptyState">Implied volatility is unavailable for this selected asset/provider. Realized-volatility analytics remain active.</div>';
  $("vol53Move1d").textContent=Number.isFinite(x.move1d)?`±${money(x.move1d)} · ${(x.move1d/x.price*100).toFixed(2)}%`:"—";$("vol53Move7d").textContent=Number.isFinite(x.move7d)?`±${money(x.move7d)} · ${(x.move7d/x.price*100).toFixed(2)}%`:"—";$("vol53IvMove1d").textContent=Number.isFinite(iv.move1d)?`±${money(iv.move1d)} · ${(iv.move1d/x.price*100).toFixed(2)}%`:"—";$("vol53IvMove7d").textContent=Number.isFinite(iv.move7d)?`±${money(iv.move7d)} · ${(iv.move7d/x.price*100).toFixed(2)}%`:"—";$("vol53Range1d").textContent=Number.isFinite(x.move1d)?`${num(x.price-x.move1d)} ↔ ${num(x.price+x.move1d)}`:"—";$("vol53Range7d").textContent=Number.isFinite(x.move7d)?`${num(x.price-x.move7d)} ↔ ${num(x.price+x.move7d)}`:"—";
  $("vol53MtfMap").innerHTML=x.mtf.length?x.mtf.map(r=>`<div class="volTf"><span class="label">${r.tf}</span><b class="${r.state==="EXTREME"?"volBad":r.state==="ELEVATED"?"volWarn":r.state==="COMPRESSED"?"volGood":"volNeutral"}">${r.state}</b><small>RV percentile ${Number.isFinite(r.rvPercentile)?r.rvPercentile.toFixed(0)+"%":"—"}</small><small>ATR ${Number.isFinite(r.atrPct)?r.atrPct.toFixed(2)+"%":"—"}</small><small>${r.ttm}</small></div>`).join(""):'<div class="emptyState">No MTF volatility rows.</div>';
  const bucket=Math.floor(x.ts/300000),compactState={ts:x.ts,market:x.market,symbol:x.symbol,tf:x.tf,source:x.source,regime:x.regime,alert:x.alert,expansion:x.expansion,compression:x.compression,riskMultiplier:x.riskMultiplier,rv20:x.rv20,rvPct:x.rvPct,rvRatio:x.rvRatio,volOfVol:x.vov.value,parkinson:x.ranges.parkinson,garmanKlass:x.ranges.garmanKlass,semivolRatio:x.semi.ratio,clustering:x.cluster,shock2:x.shocks.sigma2,shock3:x.shocks.sigma3,iv:x.implied.available?x.implied.iv:null,ivRv:x.implied.ratio,ivPremium:x.implied.premium,mtfHigh:x.mtfHigh};
  if(localDbSupported())localDbPutRecord("volatility_intel",`${bucket}|${x.market}|${x.symbol}|${x.tf}`,compactState,x.ts).catch(()=>{});
  if(showToast)toast(`Volatility: ${x.regime} · RV20 p${Number.isFinite(x.rvPct)?x.rvPct.toFixed(0):"—"} · risk ${x.riskMultiplier.toFixed(2)}×`,x.regime==="EXTREME"||x.regime==="BREAKOUT TRANSITION"?"warn":"good");
  return x
}
function volatilityState(j,q){
 const c=j.map(x=>+x[4]),h=j.map(x=>+x[2]),l=j.map(x=>+x[3]),atr=ATR(h,l,c,14),atrPct=atr.map((x,i)=>x/c[i]*100),ma=sma(c,20),sd=stddev(c,20),bbw=c.map((x,i)=>Number.isFinite(ma[i])&&ma[i]?4*sd[i]/ma[i]*100:NaN).filter(Number.isFinite);
 const a=atrPct.slice(-120),b=bbw.slice(-120),ap=pctRank(a,a[a.length-1]),bp=pctRank(b,b[b.length-1]),sq=ap<30&&bp<30,exp=ap>70||bp>70;
 return {atrPercentile:ap,bbPercentile:bp,squeeze:sq?"ACTIVE":ap<45&&bp<45?"BUILDING":"NO",expansion:exp?"HIGH":ap>55||bp>55?"MEDIUM":"LOW"}
}
function renderVolatility(q,j){
 const v=volatilityState(j,q);$("volAtrPct").textContent=v.atrPercentile.toFixed(0)+"%";$("volBbPct").textContent=v.bbPercentile.toFixed(0)+"%";$("volSqueeze").textContent=v.squeeze;$("volSqueeze").className=v.squeeze==="ACTIVE"?"good":v.squeeze==="BUILDING"?"neutral":"";
 $("volExpansion").textContent=v.expansion;$("volExpansion").className=v.expansion==="HIGH"?"bad":v.expansion==="MEDIUM"?"neutral":"good";return v
}
function renderLiquidationProxy(q,deriv){
 const px=q.price,a=q.atr,levels=[-3,-2,-1,0,1,2,3],fund=deriv?.funding||0,ls=deriv?.ls||1,oiCh=parseFloat(deriv?.oiTrend)||0;
 let hotSide=(fund>.0003||ls>1.35)?"DOWN":(fund<-.0003||ls<.75)?"UP":"BALANCED";
 $("proxyMap").innerHTML=levels.map(n=>{let price=px+n*a*1.25,cls="cool";if((hotSide==="DOWN"&&n<0)||(hotSide==="UP"&&n>0))cls=Math.abs(n)<=2?"hot":"mid";else if(n===0)cls="mid";return `<div class="proxyLvl ${cls}">${n===0?"SPOT":(n>0?"+":"")+n+" ATR"}<br><b>${num(price)}</b></div>`}).join("");
 let bias=hotSide==="DOWN"?"LONG LIQUIDATION RISK":hotSide==="UP"?"SHORT SQUEEZE RISK":"BALANCED";if(Math.abs(oiCh)>=3)bias+=" · OI EXPANSION";$("proxyBias").textContent=bias;$("proxyBias").className=hotSide==="DOWN"?"bad":hotSide==="UP"?"good":"neutral"
}
function buildDecision(q,hs,mc,sm){
 const reasons=[],push=(name,good,txt)=>reasons.push({name,good,txt});
 push("Trend",q.trendScore>=55,q.trendScore.toFixed(0)+"/100");
 push("Momentum",q.momScore>=55,q.momScore.toFixed(0)+"/100");
 push("Structure",q.structureScore>=55,q.structureScore.toFixed(0)+"/100");
 if(q.volScore===null)push("Volume",null,"—");else push("Volume",q.volScore>=55,q.volScore.toFixed(0)+"/100");
 push("MTF",mc.avg>=55,mc.avg.toFixed(0)+"/100");
 const hp=hs.h4; if(hp)push("Historical · nedovedit",null,knnEticheta(hp).text.replace(/^Hist /,""));
 let blocker="None";if(sm.direction==="WAIT"){if(sm.edge<8)blocker="LONG/SHORT too close";else if(Math.max(sm.long,sm.short)<appSettings().signalMin)blocker="Confidence below threshold";else if(q.smc.trap)blocker="Liquidity trap";else blocker="Insufficient confluence"}
 $("decisionAction").textContent=sm.direction;$("decisionAction").className="decisionBig "+(sm.direction==="LONG"?"good":sm.direction==="SHORT"?"bad":"neutral");
 $("decisionSub").textContent=`Edge ${sm.edge.toFixed(0)} · Score ${q.score.toFixed(0)} · MTF ${mc.avg.toFixed(0)}`;$("decisionLong").textContent=sm.long.toFixed(0);$("decisionShort").textContent=sm.short.toFixed(0);$("decisionRegime").textContent=q.regime;$("decisionHist").textContent=hp?`${hp.up.toFixed(0)}%↑ / ${hp.down.toFixed(0)}%↓${Number.isFinite(+hp.banda)?" ±"+hp.banda.toFixed(0):""} · nedovedit`:"N/A";$("decisionBlocker").textContent=blocker;
 $("decisionReasons").innerHTML=reasons.map(r=>`<div class="reason"><span>${r.good===null?"·":r.good?"✓":"×"}</span><span>${r.name}</span><b class="${r.good===null?"neutral":r.good?"good":"bad"}">${r.txt}</b></div>`).join("");renderV65DecisionOS(false)
}
function returnsFromKlines(k,n=100){let c=k.map(x=>+x[4]).slice(-(n+1)),r=[];for(let i=1;i<c.length;i++)r.push(c[i]/c[i-1]-1);return r}
function corr(a,b){let n=Math.min(a.length,b.length);if(n<5)return NaN;a=a.slice(-n);b=b.slice(-n);let ma=a.reduce((x,y)=>x+y,0)/n,mb=b.reduce((x,y)=>x+y,0)/n,num=0,da=0,db=0;for(let i=0;i<n;i++){let x=a[i]-ma,y=b[i]-mb;num+=x*y;da+=x*x;db+=y*y}return da&&db?num/Math.sqrt(da*db):NaN}
function beta(a,b){let n=Math.min(a.length,b.length);a=a.slice(-n);b=b.slice(-n);let ma=a.reduce((x,y)=>x+y,0)/n,mb=b.reduce((x,y)=>x+y,0)/n,cov=0,v=0;for(let i=0;i<n;i++){cov+=(a[i]-ma)*(b[i]-mb);v+=(b[i]-mb)**2}return v?cov/v:NaN}
async function loadCorrelation(){
 const sym=norm($("symbol").value),stocks=assetClass()==="STOCKS",refs=stocks?["QQQ","SPY","IWM"]:["BTCUSDT","ETHUSDT","SOLUSDT"],src=analysisSource();try{
   const [sel,...ks]=await Promise.all([analysisKlines(sym,"4h",220,src),...refs.map(x=>analysisKlines(x,"4h",220,src))]),sr=returnsFromKlines(sel),names=stocks?[stockSymbol(sym),"QQQ","SPY","IWM"]:[coin(sym),"BTC","ETH","SOL"],rs=[sr,...ks.map(returnsFromKlines)];
   let html=`<div></div>${names.slice(1).map(x=>`<div class="hmHead">${x}</div>`).join("")}`;
   html+=`<div class="hmLabel">${names[0]}</div>${rs.slice(1).map(r=>{let c=corr(sr,r);return `<div class="corrCell ${c>=0?"corrPos":"corrNeg"}">${Number.isFinite(c)?c.toFixed(2):"—"}</div>`}).join("")}`;
   $("corrGrid").innerHTML=html;let b=beta(sr,rs[1]),selPerf=sr.reduce((a,x)=>a+x,0),btcPerf=rs[1].reduce((a,x)=>a+x,0),ethPerf=rs[2].reduce((a,x)=>a+x,0);
   $("betaBtc").textContent=Number.isFinite(b)?b.toFixed(2):"N/A";$("rsBtc").textContent=((selPerf-btcPerf)*100).toFixed(2)+"%";$("rsEth").textContent=((selPerf-ethPerf)*100).toFixed(2)+"%";
   let cb=corr(sr,rs[1]);$("corrRegime").textContent=!Number.isFinite(cb)?"N/A":cb>.75?"HIGH":cb>.4?"MEDIUM":"LOW"
 }catch(e){$("corrGrid").innerHTML=`<div class="emptyState">Correlation unavailable: ${escapeHtml(e.message)}</div>`}
}
function paperTradesLocal(){try{return JSON.parse(localStorage.getItem("paperTrades")||"[]")}catch{return []}}
function paperTrades(){return mergeById([...paperTradeArchive,...paperTradesLocal()])}
function setPaperTrades(a){paperTradeArchive=mergeById([...a,...paperTradeArchive]);if(!appSettings().privacySessionOnly){archivePaperRows(a).catch(()=>{});localStorage.setItem("paperTrades",JSON.stringify(a.slice(0,200)))}renderPaper()}
function paperTerminalStatus(t){
 return ["CLOSED","TP3","STOP","GAP STOP","BE STOP","TRAIL STOP","VOL STOP","TIME STOP","TP1+BE","TP2+STOP","MANUAL","EXPIRED","CANCELLED"].includes(String(t.status||""))
}
function paperActiveEntryOrders(t){return Array.isArray(t.entryOrders)?t.entryOrders.filter(o=>o.state==="PENDING"||o.state==="PARTIAL"):[]}
function paperEntryPending(t){return !t.entryClosed&&(paperActiveEntryOrders(t).length>0||["PENDING","PARTIAL"].includes(String(t.status||"")))}
function paperPositionActive(t){return (+t.qtyOpen||0)>1e-12&&!paperTerminalStatus(t)}
function paperOrderActive(t){return paperEntryPending(t)||paperPositionActive(t)}
function paperBuildEntryOrders(t,cfg={}){
 const layers=Math.max(1,Math.min(3,+t.entryLayers||+cfg.entryLayers||1)),lo=Math.min(+t.entryLow||+t.plannedEntry,+t.entryHigh||+t.plannedEntry),hi=Math.max(+t.entryLow||+t.plannedEntry,+t.entryHigh||+t.plannedEntry),mid=(lo+hi)/2,dir=t.direction==="LONG"?1:-1;
 const prices=layers===1?[+t.plannedEntry]:layers===2?(dir>0?[hi,lo]:[lo,hi]):(dir>0?[hi,mid,lo]:[lo,mid,hi]);
 const qty=(+t.qtyTarget||0)/prices.length;
 return prices.map((price,i)=>({id:`E${i+1}`,price,qtyTarget:i===prices.length-1?Math.max(0,(+t.qtyTarget||0)-qty*(prices.length-1)):qty,qtyFilled:0,state:"PENDING",createdTs:+t.placedBarTs||Date.now()}))
}
function paperMigrateTrade(t){
 t.events=Array.isArray(t.events)?t.events:[];
 t.entryType=t.entryType||"LEGACY";
 t.entryState=t.entryState||(String(t.entryType).toUpperCase()==="LEGACY"?"FILLED":t.status==="PENDING"?"PENDING":t.status==="PARTIAL"?"PARTIAL":(+t.qtyFilled||0)>0?"FILLED":"PENDING");
 t.fillModel=t.fillModel||"CONSERVATIVE";
 t.maxWaitBars=Number.isFinite(+t.maxWaitBars)?+t.maxWaitBars:8;
 t.plannedEntry=Number.isFinite(+t.plannedEntry)?+t.plannedEntry:+t.entry;
 t.entryLimit=Number.isFinite(+t.entryLimit)?+t.entryLimit:t.plannedEntry;
 t.entryLow=Number.isFinite(+t.entryLow)?+t.entryLow:t.plannedEntry;
 t.entryHigh=Number.isFinite(+t.entryHigh)?+t.entryHigh:t.plannedEntry;
 t.qtyTarget=Number.isFinite(+t.qtyTarget)?+t.qtyTarget:(+t.qty||0);
 if(!Number.isFinite(+t.qtyFilled))t.qtyFilled=String(t.entryType).toUpperCase()==="LEGACY"?(+t.qty||0):Math.max(0,(+t.qty||0)-(+t.qtyOpen||0));
 if(!Number.isFinite(+t.qtyOpen))t.qtyOpen=paperTerminalStatus(t)?0:+t.qtyFilled;
 if(!Number.isFinite(+t.plannedNotional))t.plannedNotional=t.plannedEntry*t.qtyTarget;
 if(!Number.isFinite(+t.filledNotional))t.filledNotional=(+t.entry||t.plannedEntry)*(+t.qtyFilled||0);
 if(!Number.isFinite(+t.entrySlippageNotional))t.entrySlippageNotional=0;
 if(!Number.isFinite(+t.entryFillNotional))t.entryFillNotional=0;
 if(!Number.isFinite(+t.waitBars))t.waitBars=0;
 if(!Number.isFinite(+t.costUsd))t.costUsd=0;
 if(!Number.isFinite(+t.realizedUsd))t.realizedUsd=0;
 t.entryLayers=Math.max(1,Math.min(3,+t.entryLayers||1));t.tp1Pct=Math.max(0,Math.min(80,+t.tp1Pct||35));t.tp2Pct=Math.max(0,Math.min(80,+t.tp2Pct||30));
 t.breakEvenR=Math.max(0,+t.breakEvenR||1);t.trailMode=t.trailMode||"ATR";t.trailStartR=Math.max(0,+t.trailStartR||1.5);t.trailAtrMult=Math.max(.25,+t.trailAtrMult||1.5);t.maxPositionBars=Math.max(1,+t.maxPositionBars||48);t.volStopAtrMult=Math.max(.5,+t.volStopAtrMult||2.25);t.ocoEnabled=t.ocoEnabled!==false;
 if(!Number.isFinite(+t.barsOpen))t.barsOpen=0;if(!Number.isFinite(+t.mfeR))t.mfeR=0;if(!Number.isFinite(+t.maeR))t.maeR=0;if(!Number.isFinite(+t.bestTarget))t.bestTarget=0;
 t.initialRiskPerUnit=Number.isFinite(+t.initialRiskPerUnit)&&+t.initialRiskPerUnit>0?+t.initialRiskPerUnit:Math.abs((+t.plannedEntry||+t.entry)-(+t.stop));
 t.managedStop=Number.isFinite(+t.managedStop)?+t.managedStop:+t.stop;t.managedStopReason=t.managedStopReason||"INITIAL STOP";
 t.highWater=Number.isFinite(+t.highWater)?+t.highWater:(+t.entry||+t.plannedEntry);t.lowWater=Number.isFinite(+t.lowWater)?+t.lowWater:(+t.entry||+t.plannedEntry);
 if(!Array.isArray(t.entryOrders)){if(String(t.entryType).toUpperCase()==="LIMIT"&&(+t.qtyFilled||0)<(+t.qtyTarget||0))t.entryOrders=paperBuildEntryOrders(t,{entryLayers:t.entryLayers});else t.entryOrders=[{id:"E1",price:+t.entry||+t.plannedEntry,qtyTarget:+t.qtyTarget||0,qtyFilled:+t.qtyFilled||0,state:(+t.qtyFilled||0)>= (+t.qtyTarget||0)?"FILLED":"CANCELLED"}]}
 return t
}
function paperDynamicSlipBps(t,rows){
 const cfg=appSettings(),r=(rows||[]).slice(-21);if(r.length<2)return Math.max(1,+cfg.slippageBps||0);
 const last=+r.at(-1)[4],atrArr=ATR(r.map(x=>+x[2]),r.map(x=>+x[3]),r.map(x=>+x[4]),14),atr=atrArr.at(-1),atrPct=last&&Number.isFinite(atr)?atr/last*100:0,turn=areVolLipsa(r.slice(-20))?null:r.slice(-20).reduce((a,x)=>a+(+x[4])*(+x[5]||0),0)/Math.max(1,r.slice(-20).length);
 // rulaj necunoscut (volum lipsa) => treapta cea mai prudenta, spusa explicit
 let liq=turn===null?11:turn>=100_000_000?.8:turn>=20_000_000?1.5:turn>=5_000_000?3:turn>=1_000_000?6:11;
 if((t.source||"BINANCE")==="TWELVEDATA")liq+=1;
 const vol=Math.min(12,Math.max(0,atrPct*.85));
 return Math.max(+cfg.slippageBps||0,liq+vol)
}
function paperAdversePrice(price,orderSide,slipBps){const k=Math.max(0,+slipBps||0)/10000;return orderSide==="BUY"?price*(1+k):price*(1-k)}
function paperEntryOrderFillFraction(t,order,bar,history){
 const dir=t.direction==="LONG"?1:-1,o=+bar[1],h=+bar[2],l=+bar[3],c=+bar[4],vLipsa=volBara(bar)===null,v=+bar[5]||0,limit=+order.price,zone=Math.max(Math.abs((+t.entryHigh)-(+t.entryLow)),Math.abs((+t.plannedEntry)-(+t.stop))*.08,Math.abs(limit)*.0005);
 const touched=dir>0?l<=limit:h>=limit;if(!touched)return {fraction:0,price:null,vr:0,penetration:0};
 const penetration=clamp(dir>0?(limit-l)/zone:(h-limit)/zone,0,1),prev=(history||[]).slice(-20),av=prev.length?prev.reduce((a,x)=>a+(+x[5]||0),0)/prev.length:0,vr=vLipsa||areVolLipsa(prev)?null:av?v/av:1,barTurnover=Math.max(1,c*v),participation=((+order.qtyTarget||0)*limit)/barTurnover;
 // volum lipsa: capacitatea si impulsul de volum nu se pot masura - se ia varianta prudenta (ca la volum 0), dar vr ramane null
 let capacity=vLipsa?.25:participation<=.001?1:participation<=.01?.85:participation<=.05?.55:.25;const model=t.fillModel==="BALANCED"?1:.78,volScore=vr===null?0:clamp(vr/1.6,0,1);let fraction=(.16+.56*penetration+.24*volScore)*capacity*model;
 const crossedOpen=dir>0?o<=limit:o>=limit;if(crossedOpen)fraction=Math.max(fraction,t.fillModel==="BALANCED"?.95:.78);fraction=clamp(fraction,.08,1);
 const price=dir>0?(o<=limit?Math.min(o,limit):limit):(o>=limit?Math.max(o,limit):limit);return {fraction,price,vr,penetration}
}
function paperEntryFillFraction(t,bar,history){return paperEntryOrderFillFraction(t,{price:+t.entryLimit,qtyTarget:+t.qtyTarget||0},bar,history)}
function paperApplyEntryFill(t,price,qty,label,slipBps=0,barTs=Date.now()){
 qty=Math.min(Math.max(0,qty),Math.max(0,(+t.qtyTarget||0)-(+t.qtyFilled||0)));if(qty<=0)return;
 const prevQty=+t.qtyFilled||0,prevEntry=prevQty?(+t.entry||+t.plannedEntry):0,newQty=prevQty+qty,avg=(prevEntry*prevQty+price*qty)/newQty,notional=price*qty,fee=notional*(+appSettings().feeBps||0)/10000,dir=t.direction==="LONG"?1:-1,slip=dir*(price/(+t.plannedEntry||price)-1)*10000;
 t.entry=avg;t.qtyFilled=newQty;t.qtyOpen=(+t.qtyOpen||0)+qty;t.filledNotional=avg*newQty;t.notional=t.filledNotional;t.realizedUsd=(+t.realizedUsd||0)-fee;t.costUsd=(+t.costUsd||0)+fee+Math.max(0,notional*(+slipBps||0)/10000);
 t.entryFillNotional=(+t.entryFillNotional||0)+notional;t.entrySlippageNotional=(+t.entrySlippageNotional||0)+slip*notional;t.firstFillTs=t.firstFillTs||barTs;t.lastFillTs=barTs;
 const remain=Math.max(0,(+t.qtyTarget||0)-newQty);t.status=remain<=Math.max(1e-12,(+t.qtyTarget||0)*.02)?"OPEN":"PARTIAL";t.entryState=t.status==="OPEN"?"FILLED":"PARTIAL";if(t.status==="OPEN"){t.qtyFilled=t.qtyTarget;t.qtyOpen=Math.min(t.qtyOpen,t.qtyTarget);t.filledAt=barTs;t.entryClosed=true}
 t.highWater=Math.max(+t.highWater||price,price);t.lowWater=Math.min(+t.lowWater||price,price);t.events.push({ts:Date.now(),barTs,label,price,qty,pnlUsd:-fee,feeUsd:fee,slippageBps:slip,fillRatio:(+t.qtyFilled||0)/(+t.qtyTarget||1)})
}
function paperCancelEntryRemainder(t,label="ENTRY REMAINDER CANCELLED",barTs=Date.now()){
 if(t.entryClosed&&paperActiveEntryOrders(t).length===0)return;let rem=0;for(const o of paperActiveEntryOrders(t)){rem+=Math.max(0,(+o.qtyTarget||0)-(+o.qtyFilled||0));o.state="CANCELLED";o.cancelledTs=barTs}t.entryClosed=true;if(rem<=1e-12)rem=Math.max(0,(+t.qtyTarget||0)-(+t.qtyFilled||0));if(rem>1e-12)t.events.push({ts:Date.now(),barTs,label,qty:rem,pnlUsd:0});if((+t.qtyOpen||0)>0&&!paperTerminalStatus(t))t.status="OPEN_PARTIAL"
}
function paperRecordOcoCancel(t,label,barTs=Date.now()){if(!t.ocoEnabled||t.ocoCancelled)return;t.ocoCancelled=true;t.events.push({ts:Date.now(),barTs,label:`OCO CANCEL · ${label}`,qty:+t.qtyOpen||0,pnlUsd:0})}
function paperExitSim(t,refPrice,qty,label,slipBps=0,marketOrder=true,barTs=Date.now()){
 qty=Math.min(+t.qtyOpen||0,Math.max(0,qty));if(qty<=0)return;const orderSide=t.direction==="LONG"?"SELL":"BUY",price=marketOrder?paperAdversePrice(refPrice,orderSide,slipBps):refPrice,dir=t.direction==="LONG"?1:-1,gross=dir*(price-(+t.entry))*qty,fee=price*qty*(+appSettings().feeBps||0)/10000,carry=v63PaperCarryUsd(t,qty,price,barTs),pnl=gross-fee-carry;
 t.realizedUsd=(+t.realizedUsd||0)+pnl;t.qtyOpen=Math.max(0,(+t.qtyOpen||0)-qty);t.carryUsd=(+t.carryUsd||0)+carry;t.costUsd=(+t.costUsd||0)+fee+Math.max(0,carry)+(marketOrder?price*qty*(+slipBps||0)/10000:0);t.events.push({ts:Date.now(),barTs,label,price,refPrice,qty,pnlUsd:pnl,feeUsd:fee,carryUsd:carry,slippageBps:marketOrder?slipBps:0,gap:/GAP/.test(label)});return price
}
function paperExpireEntry(t,barTs){
 if(!paperEntryPending(t))return;for(const o of paperActiveEntryOrders(t)){o.state="EXPIRED";o.cancelledTs=barTs}if((+t.qtyFilled||0)<=1e-12){t.status="EXPIRED";t.entryState="EXPIRED";t.entryClosed=true;t.events.push({ts:Date.now(),barTs,label:"ENTRY EXPIRED",qty:+t.qtyTarget||0,pnlUsd:0})}else{paperCancelEntryRemainder(t,"ENTRY EXPIRED · REMAINDER CANCELLED",barTs);t.entryState="PARTIAL_CANCELLED";t.status="OPEN_PARTIAL"}
}
function paperProcessEntryBar(t,bar,history){
 if(!paperEntryPending(t))return;t.waitBars=(+t.waitBars||0)+1;for(const o of paperActiveEntryOrders(t)){const f=paperEntryOrderFillFraction(t,o,bar,history);if(!(f.fraction>0&&f.price))continue;const rem=Math.max(0,(+o.qtyTarget||0)-(+o.qtyFilled||0)),qty=Math.min(rem,rem*f.fraction);paperApplyEntryFill(t,f.price,qty,`LIMIT ${o.id} FILL · ${(f.fraction*100).toFixed(0)}%`,0,+bar[0]);o.qtyFilled=(+o.qtyFilled||0)+qty;o.state=(+o.qtyFilled||0)>=Math.max(0,(+o.qtyTarget||0)*.98)?"FILLED":"PARTIAL";o.lastFillTs=+bar[0];if(t.entryClosed)break}
 if(paperActiveEntryOrders(t).length===0)t.entryClosed=true;if(paperEntryPending(t)&&(+t.waitBars||0)>=Math.max(1,+t.maxWaitBars||8))paperExpireEntry(t,+bar[0])
}
function paperAtrNow(rows){const r=(rows||[]).slice(-30);if(r.length<15)return NaN;const a=ATR(r.map(x=>+x[2]),r.map(x=>+x[3]),r.map(x=>+x[4]),14);return +a.at(-1)}
function paperTightenStop(t,candidate,reason,barTs=Date.now()){
 if(!Number.isFinite(+candidate))return false;const dir=t.direction==="LONG"?1:-1,cur=+t.managedStop,improves=dir>0?candidate>cur:candidate<cur;if(!improves)return false;t.managedStop=candidate;t.managedStopReason=reason;t.events.push({ts:Date.now(),barTs,label:`STOP UPDATE · ${reason}`,price:candidate,qty:+t.qtyOpen||0,pnlUsd:0});return true
}
function paperUpdateExcursions(t,bar){
 if(!paperPositionActive(t)||!Number.isFinite(+t.entry))return;const h=+bar[2],l=+bar[3],dir=t.direction==="LONG"?1:-1,risk=Math.max(1e-12,+t.initialRiskPerUnit||Math.abs((+t.entry)-(+t.stop)));t.highWater=Math.max(+t.highWater||h,h);t.lowWater=Math.min(+t.lowWater||l,l);const fav=dir>0?h-(+t.entry):(+t.entry)-l,adv=dir>0?(+t.entry)-l:h-(+t.entry);t.mfeR=Math.max(+t.mfeR||0,fav/risk);t.maeR=Math.max(+t.maeR||0,adv/risk)
}
function paperStatusForStopReason(reason){if(reason==="TRAIL STOP")return "TRAIL STOP";if(reason==="VOL STOP")return "VOL STOP";if(reason==="BREAK EVEN")return "BE STOP";return "STOP"}
function paperProcessPositionBar(t,bar,rows){
 if(!paperPositionActive(t))return;t.barsOpen=(+t.barsOpen||0)+1;const o=+bar[1],h=+bar[2],l=+bar[3],c=+bar[4],dir=t.direction==="LONG"?1:-1,stop=+t.managedStop,slip=paperDynamicSlipBps(t,rows),gapStop=dir>0?o<=stop:o>=stop;
 if(gapStop){paperCancelEntryRemainder(t,"ENTRY REMAINDER CANCELLED · GAP STOP",+bar[0]);paperRecordOcoCancel(t,"GAP STOP",+bar[0]);paperExitSim(t,o,t.qtyOpen,"GAP STOP",slip,true,+bar[0]);t.status="GAP STOP";return}
 const nextTp=t.bestTarget<1?+t.tp1:t.bestTarget<2?+t.tp2:t.bestTarget<3?+t.tp3:null,stopTouched=dir>0?l<=stop:h>=stop,tpTouched=nextTp!=null&&(dir>0?h>=nextTp:l<=nextTp);let allowTargets=true;
 if(stopTouched&&tpTouched){const conservative=(t.fillModel||"CONSERVATIVE")==="CONSERVATIVE",targetFirst=!conservative&&Math.abs(o-nextTp)<Math.abs(o-stop);t.events.push({ts:Date.now(),barTs:+bar[0],label:`OHLC AMBIGUITY · ${targetFirst?"TARGET FIRST":"STOP FIRST"}`,price:o,qty:+t.qtyOpen||0,pnlUsd:0});if(!targetFirst){paperCancelEntryRemainder(t,"ENTRY REMAINDER CANCELLED · INTRABAR STOP",+bar[0]);const reason=t.managedStopReason||"INITIAL STOP";paperRecordOcoCancel(t,reason,+bar[0]);paperExitSim(t,stop,t.qtyOpen,reason,slip,true,+bar[0]);t.status=paperStatusForStopReason(reason);return}else allowTargets=true}
 else if(stopTouched){paperCancelEntryRemainder(t,"ENTRY REMAINDER CANCELLED · STOP",+bar[0]);const reason=t.managedStopReason||"INITIAL STOP";paperRecordOcoCancel(t,reason,+bar[0]);paperExitSim(t,stop,t.qtyOpen,reason,slip,true,+bar[0]);t.status=paperStatusForStopReason(reason);return}
 const targetHit=lvl=>dir>0?h>=lvl:l<=lvl;
 if(allowTargets&&t.bestTarget<1&&targetHit(+t.tp1)&&paperPositionActive(t)){paperCancelEntryRemainder(t,"ENTRY REMAINDER CANCELLED · TP1",+bar[0]);paperExitSim(t,+t.tp1,Math.min(t.qtyOpen,(+t.qtyFilled||0)*(+t.tp1Pct||35)/100),"TP1",0,false,+bar[0]);t.bestTarget=1}
 if(allowTargets&&t.bestTarget<2&&targetHit(+t.tp2)&&paperPositionActive(t)){paperExitSim(t,+t.tp2,Math.min(t.qtyOpen,(+t.qtyFilled||0)*(+t.tp2Pct||30)/100),"TP2",0,false,+bar[0]);t.bestTarget=2}
 if(allowTargets&&t.bestTarget<3&&targetHit(+t.tp3)&&paperPositionActive(t)){paperExitSim(t,+t.tp3,t.qtyOpen,"TP3",0,false,+bar[0]);t.bestTarget=3;t.status="TP3";paperRecordOcoCancel(t,"TP3",+bar[0]);return}
 paperUpdateExcursions(t,bar);const risk=Math.max(1e-12,+t.initialRiskPerUnit||Math.abs((+t.entry)-(+t.stop))),atr=paperAtrNow(rows);
 if((+t.mfeR||0)>= (+t.breakEvenR||1))paperTightenStop(t,+t.entry,"BREAK EVEN",+bar[0]);
 if(Number.isFinite(atr)&&(+t.volStopAtrMult||0)>0){const volCandidate=dir>0?(+t.entry)-atr*(+t.volStopAtrMult):(+t.entry)+atr*(+t.volStopAtrMult);paperTightenStop(t,volCandidate,"VOL STOP",+bar[0])}
 if(t.trailMode==="ATR"&&Number.isFinite(atr)&&(+t.mfeR||0)>= (+t.trailStartR||1.5)){const trail=dir>0?(+t.highWater)-atr*(+t.trailAtrMult||1.5):(+t.lowWater)+atr*(+t.trailAtrMult||1.5);paperTightenStop(t,trail,"TRAIL STOP",+bar[0])}
 if(paperPositionActive(t)&&(+t.barsOpen||0)>=Math.max(1,+t.maxPositionBars||48)){paperCancelEntryRemainder(t,"ENTRY REMAINDER CANCELLED · TIME STOP",+bar[0]);paperRecordOcoCancel(t,"TIME STOP",+bar[0]);paperExitSim(t,c,t.qtyOpen,"TIME STOP",slip,true,+bar[0]);t.status="TIME STOP"}
}
function addPaperTrade(){
 if(typeof v65PaperEntryAllowed==="function"&&!v65PaperEntryAllowed())return;
 const st=window.__radarState,ss=window.__signalState;if(!st||!ss||ss.tm.direction==="WAIT"){toast("Need active LONG/SHORT setup","warn");return}if(typeof v67EntryAllowed==="function"&&!v67EntryAllowed("PAPER",ss.tm.direction))return;const v67fp=typeof v67CurrentFingerprint==="function"?v67CurrentFingerprint(ss.tm.direction):"";const v63ci=v63CostInputSnapshot(ss.tm.direction);if(v63ci.instrument==="STOCK"&&ss.tm.direction==="SHORT"&&v63ci.locate==="UNAVAILABLE"){toast("Paper short blocked: stock locate is marked UNAVAILABLE in v63 cost model.","bad");return}const e=(ss.tm.entryLow+ss.tm.entryHigh)/2,dist=Math.abs(e-ss.tm.stop),acc=paperAccountStats(),cfg=acc.cfg,adaptive=adaptivePaperRiskMultiplier();
 if(adaptive.cb.state==="PAUSE"){toast("Paper circuit breaker is PAUSE: "+adaptive.cb.reason,"bad");return}if(adaptive.life.state==="RETIRED"){toast("Current strategy segment is RETIRED by evidence gate.","bad");return}if(!dist){toast("Invalid stop distance","warn");return}if(acc.positions.length+acc.pending.length>=cfg.maxPositions){toast(`Paper max positions/orders reached (${cfg.maxPositions})`,"bad");return}
 const riskUsd=Math.max(0,acc.equity*cfg.riskPct/100*adaptive.mult);if(riskUsd<=0){toast("Adaptive paper risk multiplier is 0.","bad");return}const qty=riskUsd/dist,plannedNotional=qty*e,newExposure=acc.exposure+(acc.reservedExposure||0)+plannedNotional;if(newExposure>acc.equity*cfg.maxExposurePct/100){toast("Paper exposure + pending reserve limit exceeded","bad");return}
 const pre=window.__portfolioRisk?.preTrade,clusterSymbols=pre&&pre.candidate?.symbol===st.symbol?pre.clusterSymbols:[st.symbol],budgetGate=paperBudgetGate(riskUsd,assetClass(),st.q.regime||"UNKNOWN",st.symbol,plannedNotional,clusterSymbols);if(budgetGate.state==="BLOCK"){toast(`Paper risk budget blocked · ${budgetGate.worst.key} ${(budgetGate.worst.ratio*100).toFixed(0)}%`,"bad");return}
 const a=paperTrades(),placedBarTs=+st.j?.at(-1)?.[0]||Date.now(),t=paperMigrateTrade({id:Date.now(),symbol:st.symbol,source:st.source||analysisSource(),market:assetClass(),tf:st.tf,mode:st.mode,regime:st.q.regime||"UNKNOWN",direction:ss.tm.direction,plannedEntry:e,entry:e,entryLimit:e,entryLow:ss.tm.entryLow,entryHigh:ss.tm.entryHigh,stop:ss.tm.stop,managedStop:ss.tm.stop,managedStopReason:"INITIAL STOP",tp1:ss.tm.tp1,tp2:ss.tm.tp2,tp3:ss.tm.tp3,opened:Date.now(),created:Date.now(),placedBarTs,lastProcessedBarTs:placedBarTs,status:"PENDING",last:st.q.price,pnl:0,realized:null,qty,qtyTarget:qty,qtyFilled:0,qtyOpen:0,plannedNotional,notional:0,filledNotional:0,riskUsd,riskMultiplier:adaptive.mult,strategyState:adaptive.life.state,leverage:cfg.leverage,bestTarget:0,realizedUsd:0,costUsd:0,entryType:cfg.entryType,entryState:"PENDING",fillModel:cfg.fillModel,maxWaitBars:cfg.maxWaitBars,waitBars:0,entryClosed:false,portfolioBudgetState:budgetGate.state,entryLayers:cfg.entryLayers,tp1Pct:cfg.tp1Pct,tp2Pct:cfg.tp2Pct,breakEvenR:cfg.breakEvenR,trailMode:cfg.trailMode,trailStartR:cfg.trailStartR,trailAtrMult:cfg.trailAtrMult,maxPositionBars:cfg.maxPositionBars,volStopAtrMult:cfg.volStopAtrMult,ocoEnabled:true,initialRiskPerUnit:dist,barsOpen:0,mfeR:0,maeR:0,v63CostInput:v63ci,events:[{ts:Date.now(),barTs:placedBarTs,label:`ORDER CREATED · V3 · BUDGET ${budgetGate.state}`,price:e,qty,pnlUsd:0}]});
 if(cfg.entryType==="LIMIT")t.entryOrders=paperBuildEntryOrders(t,cfg);else{const slip=executionFriction(st)?.slippageBps??Math.max(1,+appSettings().slippageBps||0),side=t.direction==="LONG"?"BUY":"SELL",px=paperAdversePrice(+st.q.price,side,slip);t.entryOrders=[{id:"MKT",price:px,qtyTarget:qty,qtyFilled:qty,state:"FILLED"}];paperApplyEntryFill(t,px,qty,"MARKET FILL",slip,placedBarTs);t.entryClosed=true;t.status="OPEN"}
 a.unshift(t);setPaperTrades(a);if(typeof v67MarkSignal==="function")v67MarkSignal("PAPER",v67fp);if(typeof v67RecoverySnapshot==="function")v67RecoverySnapshot();recordPaperEquity(paperAccountStats().equity);toast(cfg.entryType==="MARKET"?`Paper market fill simulated · risk ${money(riskUsd)}`:`Paper ${cfg.entryLayers}-layer limit ladder queued · risk ${money(riskUsd)}`,"good")
}
async function refreshPaper(){
 let a=paperTrades();for(const raw of a.filter(paperOrderActive)){const t=paperMigrateTrade(raw);try{const [tk,rows]=await Promise.all([analysisTicker(t.symbol,t.source||"BINANCE"),analysisKlines(t.symbol,t.tf||"4h",120,t.source||"BINANCE")]),p=+(tk.lastPrice||0);if(p)t.last=p;if(!rows?.length)continue;if(!Number.isFinite(+t.lastProcessedBarTs)){t.lastProcessedBarTs=+rows.at(-1)[0];continue}const newBars=rows.filter(x=>+x[0]>+t.lastProcessedBarTs);for(const bar of newBars){if(v63TradeGapSuspected(t,+t.lastProcessedBarTs,+bar[0]))t.events.push({ts:Date.now(),barTs:+bar[0],label:"DATA GAP · POSSIBLE INTERRUPTION (NOT OFFICIAL HALT)",qty:+t.qtyOpen||0,pnlUsd:0});const idx=rows.findIndex(x=>+x[0]===+bar[0]),hist=idx>0?rows.slice(Math.max(0,idx-25),idx):[];if(paperEntryPending(t))paperProcessEntryBar(t,bar,hist);if(paperPositionActive(t))paperProcessPositionBar(t,bar,rows.slice(0,idx+1));t.lastProcessedBarTs=+bar[0];if(paperTerminalStatus(t))break}const openGross=paperTradeUnreal(t),den=Math.max(1,+t.filledNotional||+t.plannedNotional||1);t.pnl=((+t.realizedUsd||0)+openGross)/den*100;if((+t.qtyOpen||0)<=1e-12&&!paperEntryPending(t)&&!paperTerminalStatus(t)){t.status="CLOSED";t.realized=t.pnl}if(paperTerminalStatus(t))t.realized=t.pnl}catch{}}
 !appSettings().privacySessionOnly&&localStorage.setItem("paperTrades",JSON.stringify(a.slice(0,200)));recordPaperEquity(paperAccountStats().equity);renderPaper()
}
function closePaper(id){let a=paperTrades(),t=a.find(x=>x.id===id);if(t){paperMigrateTrade(t);if(paperEntryPending(t)&&(+t.qtyFilled||0)<=1e-12){paperCancelEntryRemainder(t,"ORDER CANCELLED",Date.now());t.entryState="CANCELLED";t.status="CANCELLED"}else if(paperOrderActive(t)){paperCancelEntryRemainder(t,"ENTRY REMAINDER CANCELLED · MANUAL");const p=+t.last||+t.entry;if((+t.qtyOpen||0)>0)paperExitSim(t,p,t.qtyOpen,"MANUAL",paperDynamicSlipBps(t,[]),true,Date.now());t.status="CLOSED";t.realized=(+t.realizedUsd||0)/Math.max(1,+t.filledNotional||1)*100;paperRecordOcoCancel(t,"MANUAL",Date.now())}}!appSettings().privacySessionOnly&&localStorage.setItem("paperTrades",JSON.stringify(a.slice(0,200)));recordPaperEquity(paperAccountStats().equity);renderPaper()}
function paperCancelPending(id){const a=paperTrades(),t=a.find(x=>x.id===id);if(!t)return;paperMigrateTrade(t);paperCancelEntryRemainder(t,"ENTRY LADDER CANCELLED",Date.now());if((+t.qtyOpen||0)<=1e-12){t.status="CANCELLED";t.entryState="CANCELLED"}setPaperTrades(a)}
function paperMoveBreakEven(id){const a=paperTrades(),t=a.find(x=>x.id===id);if(!t||!paperPositionActive(paperMigrateTrade(t)))return;paperTightenStop(t,+t.entry,"BREAK EVEN",Date.now());setPaperTrades(a);toast("Paper stop moved to break-even","good")}
function paperPartialClose(id,pct=25){const a=paperTrades(),t=a.find(x=>x.id===id);if(!t||!paperPositionActive(paperMigrateTrade(t)))return;const qty=(+t.qtyOpen||0)*Math.max(1,Math.min(100,+pct||25))/100,p=+t.last||+t.entry,slip=paperDynamicSlipBps(t,[]);paperExitSim(t,p,qty,`MANUAL SCALE-OUT ${pct}%`,slip,true,Date.now());if((+t.qtyOpen||0)<=1e-12){t.status="CLOSED";paperRecordOcoCancel(t,"MANUAL SCALE-OUT",Date.now())}setPaperTrades(a);recordPaperEquity(paperAccountStats().equity)}
function paperFlattenAll(){let a=paperTrades(),n=0;for(const t0 of a){const t=paperMigrateTrade(t0);if(!paperOrderActive(t))continue;n++;if(paperEntryPending(t))paperCancelEntryRemainder(t,"FLATTEN · ENTRY CANCEL",Date.now());if(paperPositionActive(t)){paperExitSim(t,+t.last||+t.entry,t.qtyOpen,"FLATTEN ALL",paperDynamicSlipBps(t,[]),true,Date.now());t.status="CLOSED";paperRecordOcoCancel(t,"FLATTEN ALL",Date.now())}else if((+t.qtyFilled||0)<=1e-12)t.status="CANCELLED"}setPaperTrades(a);recordPaperEquity(paperAccountStats().equity);toast(`Paper flattened · ${n} active orders/positions`,n?"warn":"good")}
function paperOrderSummary(t){paperMigrateTrade(t);const a=t.entryOrders||[],filled=a.filter(o=>o.state==="FILLED").length,active=a.filter(o=>o.state==="PENDING"||o.state==="PARTIAL").length;return `${filled}/${a.length} layers · ${active} active`}
function renderPaperExecEvents(a){const events=[];for(const t of a)for(const e of (t.events||[]))events.push({...e,symbol:coin(t.symbol),direction:t.direction,tradeId:t.id});events.sort((x,y)=>(+y.ts||0)-(+x.ts||0));const rows=events.slice(0,60),box=$("paperExecEvents");if(!box)return;box.innerHTML=rows.length?`<div class="execEventRow"><div class="execCell">Time</div><div class="execCell">Symbol</div><div class="execCell">Event</div><div class="execCell">Price / Qty</div><div class="execCell">Cost / PnL</div></div>`+rows.map(e=>`<div class="execEventRow"><div class="execCell">${new Date(+e.ts||Date.now()).toLocaleString()}</div><div class="execCell">${escapeHtml(e.symbol)}</div><div class="execCell">${escapeHtml(e.label||"—")}</div><div class="execCell">${Number.isFinite(+e.price)?num(+e.price):"—"} / ${Number.isFinite(+e.qty)?(+e.qty).toFixed(5):"—"}</div><div class="execCell ${(e.pnlUsd||0)>=0?"good":"bad"}">${Number.isFinite(+e.pnlUsd)?money(+e.pnlUsd):"—"}${Number.isFinite(+e.slippageBps)?` · ${(+e.slippageBps).toFixed(1)}bps`:""}</div></div>`).join(""):'<div class="emptyState">No simulated execution events.</div>'}
function archivePaperV3Snapshot(a,acc){if(!localDbSupported()||appSettings().privacySessionOnly)return;const ts=Date.now(),bucket=Math.floor(ts/300000),positions=a.filter(paperPositionActive),pending=a.filter(paperEntryPending),terminal=a.filter(paperTerminalStatus),compact={ts,equity:acc.equity,realized:acc.real,unrealized:acc.unreal,exposure:acc.exposure,positions:positions.length,pending:pending.length,terminal:terminal.length,costUsd:a.reduce((z,t)=>z+(+t.costUsd||0),0),mfeAvg:terminal.length?terminal.reduce((z,t)=>z+(+t.mfeR||0),0)/terminal.length:null,maeAvg:terminal.length?terminal.reduce((z,t)=>z+(+t.maeR||0),0)/terminal.length:null};localDbPutRecord("paper_v3",`${bucket}|${assetClass()}`,compact,ts).catch(()=>{})}
function renderPaper(){
 const cfg=paperSettings();for(const [id,v] of [["paperStartCapital",cfg.startingCapital],["paperRiskPct",cfg.riskPct],["paperMaxDaily",cfg.maxDailyLossPct],["paperMaxWeekly",cfg.maxWeeklyLossPct],["paperMaxDd",cfg.maxDdPct],["paperMaxExposure",cfg.maxExposurePct],["paperLeverage",cfg.leverage],["paperEntryType",cfg.entryType],["paperFillModel",cfg.fillModel],["paperMaxWaitBars",cfg.maxWaitBars],["paperEntryLayers",cfg.entryLayers],["paperTpPlan",`${cfg.tp1Pct}/${cfg.tp2Pct}`],["paperBreakEvenR",cfg.breakEvenR],["paperTrailMode",cfg.trailMode],["paperTrailStartR",cfg.trailStartR],["paperTrailAtr",cfg.trailAtrMult],["paperMaxPositionBars",cfg.maxPositionBars],["paperVolStopAtr",cfg.volStopAtrMult],["paperMaxPositions",cfg.maxPositions]])if($(id))$(id).value=String(v);
 const a=paperTrades().map(paperMigrateTrade),positions=a.filter(paperPositionActive),pending=a.filter(paperEntryPending),terminal=a.filter(paperTerminalStatus),un=positions.reduce((z,x)=>z+(x.pnl||0),0),real=terminal.filter(x=>(+x.qtyFilled||0)>0).reduce((z,x)=>z+(x.realized||0),0),completed=terminal.filter(x=>(+x.qtyFilled||0)>0),wins=completed.filter(x=>(+x.realizedUsd||0)>0).length,acc=paperAccountStats();
 $("paperOpen").textContent=positions.length;$("paperUnreal").textContent=(un>=0?"+":"")+un.toFixed(2)+"%";$("paperReal").textContent=(real>=0?"+":"")+real.toFixed(2)+"%";$("paperWin").textContent=completed.length?(wins/completed.length*100).toFixed(0)+"%":"—";$("paperExposure").textContent=acc.exposure?money(acc.exposure):"—";$("paperEquity").textContent=money(acc.equity);$("paperRealUsd").textContent=money(acc.real);$("paperUnrealUsd").textContent=money(acc.unreal);$("paperDaily").textContent=money(acc.daily);$("paperDd").textContent=money(acc.dd);$("paperMargin").textContent=money(acc.margin);
 const fillTrades=a.filter(x=>(+x.qtyTarget||0)>0),fillRatio=fillTrades.length?fillTrades.reduce((z,x)=>z+Math.min(1,(+x.qtyFilled||0)/(+x.qtyTarget||1)),0)/fillTrades.length:NaN,slips=[];for(const t of a)for(const e of (t.events||[]))if(/FILL/.test(e.label||"")&&Number.isFinite(+e.slippageBps))slips.push(+e.slippageBps);$("paperPending").textContent=pending.length;$("paperPartial").textContent=a.filter(x=>x.status==="PARTIAL"||x.status==="OPEN_PARTIAL").length;$("paperAvgSlip").textContent=slips.length?(slips.reduce((x,y)=>x+y,0)/slips.length).toFixed(1)+" bps":"—";$("paperFillRatio").textContent=Number.isFinite(fillRatio)?(fillRatio*100).toFixed(0)+"%":"—";$("paperExpired").textContent=a.filter(x=>x.status==="EXPIRED").length;$("paperGapStops").textContent=a.reduce((z,t)=>z+(t.events||[]).filter(e=>/GAP STOP/.test(e.label||"")).length,0);
 if($("paperOcoActive"))$("paperOcoActive").textContent=positions.filter(x=>x.ocoEnabled).length;if($("paperTimeStops"))$("paperTimeStops").textContent=a.filter(x=>x.status==="TIME STOP").length;if($("paperTrailStops"))$("paperTrailStops").textContent=a.filter(x=>x.status==="TRAIL STOP").length;if($("paperCosts"))$("paperCosts").textContent=money(a.reduce((z,t)=>z+(+t.costUsd||0),0));if($("paperMfeMae")){const z=completed.length?completed.reduce((q,t)=>{q.mfe+=+t.mfeR||0;q.mae+=+t.maeR||0;return q},{mfe:0,mae:0}):null;$("paperMfeMae").textContent=z?`${(z.mfe/completed.length).toFixed(2)}R / ${(z.mae/completed.length).toFixed(2)}R`:"—"}
 const rows=$("paperRows");rows.innerHTML=a.length?a.map(x=>{const ratio=(+x.qtyTarget||0)?Math.min(1,(+x.qtyFilled||0)/(+x.qtyTarget||1)):1,entry=(+x.qtyFilled||0)>0?+x.entry:+x.plannedEntry,cls=x.status==="PENDING"?"execPending":x.status==="PARTIAL"||x.status==="OPEN_PARTIAL"?"execPartial":paperPositionActive(x)?"execLive":x.status==="EXPIRED"||/STOP/.test(x.status)?"execBad":"execClosed",actions=paperOrderActive(x)?`<div class="paperActions">${paperEntryPending(x)?`<button class="pill" data-action-click="paperCancelPending(${x.id})">Cancel ladder</button>`:""}${paperPositionActive(x)?`<button class="pill" data-action-click="paperMoveBreakEven(${x.id})">BE</button><button class="pill" data-action-click="paperPartialClose(${x.id},25)">-25%</button>`:""}<button class="pill" data-action-click="closePaper(${x.id})">Close</button></div>`:'<span class="small">Done</span>';return `<div class="paperRowV3"><b>${escapeHtml(coin(x.symbol))}</b><span class="${x.direction==="LONG"?"good":"bad"}">${x.direction}</span><span>${num(entry)} · ${(ratio*100).toFixed(0)}%</span><span>${paperOrderSummary(x)}</span><span>${num(+x.managedStop)}<small>${escapeHtml(x.managedStopReason||"")}</small></span><span>T1 ${num(+x.tp1)} · T2 ${num(+x.tp2)} · T3 ${num(+x.tp3)}</span><span class="${(x.pnl||0)>=0?"good":"bad"}">${(+x.qtyFilled||0)>0?money((+x.realizedUsd||0)+paperTradeUnreal(x)):"—"}</span><span>${(+x.mfeR||0).toFixed(2)}R / ${( +x.maeR||0).toFixed(2)}R</span><span class="execStatus ${cls}">${escapeHtml(x.status)} · ${+x.barsOpen||0}b</span>${actions}</div>`}).join(""):`<div class="emptyState">No paper trades.</div>`;
 renderPaperExecEvents(a);drawPaperEquity();renderDailyDesk();renderStrategyLifecycle();renderProfitReadiness(false);archivePaperV3Snapshot(a,acc)
}

let dataFresh={rest:0,ws:0,futures:0,sentiment:0};
function markFresh(k){dataFresh[k]=Date.now();renderFreshness()}
function ageText(ts){if(!ts)return "—";let q=Math.max(0,Math.floor((Date.now()-ts)/1000));if(q<60)return q+"s";let m=Math.floor(q/60);if(m<60)return m+"m";return Math.floor(m/60)+"h"}
function renderFreshness(){if($("freshRest"))$("freshRest").textContent=ageText(dataFresh.rest);if($("freshWs"))$("freshWs").textContent=ageText(dataFresh.ws);if($("freshFut"))$("freshFut").textContent=ageText(dataFresh.futures);if($("freshSent"))$("freshSent").textContent=ageText(dataFresh.sentiment)}
function resolvedR(src=null){return researchJournalRows().filter(x=>!src||(x.source||"BINANCE")===src).map(x=>({...x,r:metricR(x)})).filter(x=>Number.isFinite(x.r))}
function chronologicalRows(rows){return [...rows].sort((a,b)=>(+a.ts||0)-(+b.ts||0))}
function resolvedChronological(src=null){return chronologicalRows(resolvedR(src))}
function recentChronological(src=null,n=20){const newest=[...resolvedR(src)].sort((a,b)=>(+b.ts||0)-(+a.ts||0)).slice(0,n);return chronologicalRows(newest)}
function maxDrawdownR(vals){let eq=0,peak=0,dd=0;for(const x of vals){eq+=x;peak=Math.max(peak,eq);dd=Math.min(dd,eq-peak)}return dd}
function renderAnalytics(){
 const r=resolvedChronological(analysisSource()),wins=r.filter(x=>x.r>0),losses=r.filter(x=>x.r<0),avg=r.length?r.reduce((a,x)=>a+x.r,0)/r.length:0,aw=wins.length?wins.reduce((a,x)=>a+x.r,0)/wins.length:0,al=losses.length?-losses.reduce((a,x)=>a+x.r,0)/losses.length:0,pay=al?aw/al:aw?99:0;
 $("anExpectancy").textContent=r.length?avg.toFixed(2)+" R":"—";$("anPayoff").textContent=r.length?pay.toFixed(2):"—";$("anMaxDd").textContent=r.length?maxDrawdownR(r.map(x=>x.r)).toFixed(2)+" R":"—";
 let byReg={};r.forEach(x=>(byReg[x.regime||"UNKNOWN"]??=[]).push(x.r));let eligible=Object.entries(byReg).filter(([,v])=>v.length>=10).sort((a,b)=>(b[1].reduce((x,y)=>x+y,0)/b[1].length)-(a[1].reduce((x,y)=>x+y,0)/a[1].length)),bestReg=eligible[0]?.[0]||"—";$("anBestRegime").textContent=bestReg==="—"?"— · need N≥10":bestReg;
 const matrix=group=>{let groups={};r.forEach(x=>{let k=group(x);(groups[k]??=[]).push(x.r)});return `<div class="mxRow"><div class="mxCell">Group</div><div class="mxCell">N</div><div class="mxCell">Win%</div><div class="mxCell">Avg R</div><div class="mxCell">Sum R</div></div>`+Object.entries(groups).sort((a,b)=>b[1].length-a[1].length).slice(0,12).map(([k,v])=>{let wr=v.filter(x=>x>0).length/v.length*100,av=v.reduce((a,b)=>a+b,0)/v.length,sum=v.reduce((a,b)=>a+b,0);return `<div class="mxRow"><div class="mxCell">${k}</div><div class="mxCell">${v.length}</div><div class="mxCell ${wr>=50?"mxGood":"mxBad"}">${wr.toFixed(0)}%</div><div class="mxCell ${av>=0?"mxGood":"mxBad"}">${av.toFixed(2)}</div><div class="mxCell ${sum>=0?"mxGood":"mxBad"}">${sum.toFixed(1)}</div></div>`}).join("")};
 $("tfMatrix").innerHTML=matrix(x=>x.tf);$("coinMatrix").innerHTML=matrix(x=>coin(x.symbol));
 const buckets=[[60,64],[65,69],[70,74],[75,79],[80,100]],cal=$("confidenceCalibration");cal.innerHTML=buckets.map(([a,b])=>{let z=r.filter(x=>Math.max(x.longConf||0,x.shortConf||0)>=a&&Math.max(x.longConf||0,x.shortConf||0)<=b),wr=z.length?z.filter(x=>x.r>0).length/z.length*100:0;return `<div class="calibrationLine"><span>${a}-${b}</span><div class="calibrationTrack"><div class="calibrationFill" style="width:${wr}%"></div></div><b>${z.length?wr.toFixed(0)+"%":"—"}</b></div>`}).join("")
}
function percentile(a,p){if(!a.length)return NaN;let x=[...a].sort((m,n)=>m-n),i=(x.length-1)*p,l=Math.floor(i),h=Math.ceil(i);return l===h?x[l]:x[l]+(x[h]-x[l])*(i-l)}
function sampleBlock(vals,len){
 const n=vals.length;if(!n)return [];const start=Math.floor(Math.random()*n),out=[];for(let i=0;i<len;i++)out.push(vals[(start+i)%n]);return out
}
async function runMonteCarlo(){
 let source=$("mcSource").value,method=$("mcMethod")?.value||"BLOCK",block=Math.max(1,+$("mcBlock")?.value||5),runs=Math.max(100,Math.min(10000,+$("mcRuns").value||1000)),trades=Math.max(20,Math.min(1000,+$("mcTrades").value||100)),vals;
 if(source==="journal")vals=resolvedChronological(analysisSource()).map(x=>x.r);else vals=paperTrades().filter(x=>Number.isFinite(+x.realizedUsd)||Number.isFinite(+x.realized)).sort((a,b)=>(+a.opened||0)-(+b.opened||0)).map(x=>Number.isFinite(+x.realizedUsd)&&+x.riskUsd?+x.realizedUsd/+x.riskUsd:(+x.realized||0)/100);
 if(vals.length<20){toast("Need at least 20 resolved outcomes for Monte Carlo","warn");return}
 let result=null;try{result=await researchWorkerTask("monteCarlo",{vals,runs,trades,method,block,seed:Date.now()>>>0},60000)}catch{}
 if(!result){let ends=[],dds=[],loss=0;for(let q=0;q<runs;q++){let seq=[];if(method==="BLOCK"){while(seq.length<trades)seq.push(...sampleBlock(vals,Math.min(block,trades-seq.length)))}else{for(let i=0;i<trades;i++)seq.push(vals[Math.floor(Math.random()*vals.length)])}let eq=0,peak=0,dd=0;for(const v of seq.slice(0,trades)){eq+=v;peak=Math.max(peak,eq);dd=Math.min(dd,eq-peak)}ends.push(eq);dds.push(dd);if(eq<0)loss++}result={median:percentile(ends,.5),p5:percentile(ends,.05),p95:percentile(ends,.95),dd:percentile(dds,.5),lossProb:loss/runs}}
 $("mcMedian").textContent=result.median.toFixed(1)+" R";$("mcP5").textContent=result.p5.toFixed(1)+" R";$("mcP95").textContent=result.p95.toFixed(1)+" R";$("mcDd").textContent=result.dd.toFixed(1)+" R";$("mcLossProb").textContent=(100*result.lossProb).toFixed(1)+"%";
 if($("mcNote"))$("mcNote").textContent=(method==="BLOCK"?`Block bootstrap · block ${block} · preserves short outcome clustering better than IID.`:"IID bootstrap · assumes outcomes are independent.")+` ${researchWorkerSupported()?"Heavy simulation dispatched to Web Worker when available.":"Worker unavailable; synchronous fallback used."} Not a forecast.`
}
function renderScenario(){
 const st=window.__radarState,ss=window.__signalState;if(!st||!ss){$("scenarioGrid").innerHTML='<div class="emptyState">Run analysis first.</div>';return}
 const q=st.q,tm=ss.tm,entry=(tm.entryLow+tm.entryHigh)/2,levels=[-3,-2,-1,0,1,2,3],dir=tm.direction,cfg=appSettings(),rtCost=2*(cfg.feeBps+cfg.slippageBps)/10000,costPct=rtCost*100;
 const netPct=p=>dir==="LONG"?(p/entry-1)*100-costPct:dir==="SHORT"?(entry/p-1)*100-costPct:0;
 $("scenarioGrid").innerHTML=levels.map(n=>{let p=q.price+n*q.atr,pnl=netPct(p);return `<div class="scenarioBox"><span>${n>=0?"+":""}${n} ATR</span><b>${num(p)}</b><span class="${pnl>=0?"good":"bad"}">${pnl>=0?"+":""}${pnl.toFixed(2)}%</span></div>`}).join("");
 const be=dir==="LONG"?entry*(1+rtCost):dir==="SHORT"?entry/(1+rtCost):NaN;$("scenarioBe").textContent=dir==="WAIT"?"—":num(be);$("scenarioCost").textContent=costPct.toFixed(3)+"%";
 let arr=levels.map(n=>netPct(q.price+n*q.atr));$("scenarioWorst").textContent=Math.min(...arr).toFixed(2)+"%";$("scenarioBest").textContent=Math.max(...arr).toFixed(2)+"%"
}
function backupJsonKey(key,fallback=null){
 try{const v=localStorage.getItem(key);return v==null?fallback:JSON.parse(v)}catch{return fallback}
}
async function exportBackup(){
 const localArchive=localDbSupported()?{records:await localDbAllRecords(100000),reports:await localReportsAll(5000),meta:{migration:await localDbMetaGet("schema-migrations"),retention:await localDbMetaGet("last-retention")}}:{records:[],reports:[],meta:{}};
 const data={
   version:"v71",schemaVersion:54,ts:Date.now(),backupType:"FULL_LOCAL_RESEARCH",
   settings:appSettings(),journal:journal(),paper:paperTrades(),paperSettings:paperSettings(),paperEquity:paperHistory(),alerts:appAlerts(),
   forwardValidationStart:forwardStart(),
   workspace:{assetClass:localStorage.getItem("assetClass")||"CRYPTO",analysisProvider:localStorage.getItem("analysisProvider")||"BINANCE",mode:localStorage.getItem("mode")||"auto",lastCrypto:localStorage.getItem("lastCrypto")||localStorage.getItem("last")||"BTC",lastStock:localStorage.getItem("lastStock")||"AAPL"},
   watchlists:{favorites:backupJsonKey("favorites",[]),favoritesStocks:backupJsonKey("favsStocks",[]),recent:backupJsonKey("recent",[]),recentStocks:backupJsonKey("recentStocks",[])},
   scanPrefs:backupJsonKey(SCAN_PREF_KEY,{}),portfolioBudgets:portfolioBudgetSettings(),strategyFamilies:{threshold:+$("familyThreshold")?.value||.82},
   researchGovernance:{config:researchGovConfig(),experiments:experimentRegistry(),modelVersions:modelVersions(),activeModelVersionId,metaEnsembleV2:serializeMetaEnsembleV2()},
   decisionCore:{observedLiquidations:liqEvents.slice(-20000),verdictCenter:window.__verdictCenter?{agreement:window.__verdictCenter.agreement,coverage:window.__verdictCenter.coverage,consensus:window.__verdictCenter.consensus,conviction:window.__verdictCenter.conviction,counts:window.__verdictCenter.counts,ts:window.__verdictCenter.ts}:null,volatility:window.__volatilityIntel?{regime:window.__volatilityIntel.regime,alert:window.__volatilityIntel.alert,rv20:window.__volatilityIntel.rv20,rvPct:window.__volatilityIntel.rvPct,riskMultiplier:window.__volatilityIntel.riskMultiplier,ts:window.__volatilityIntel.ts}:null},
   profitReadiness:{prefs:prPrefStore(),oos:prOosStore(),latest:window.__profitReadiness?{ts:window.__profitReadiness.ts,market:window.__profitReadiness.market,source:window.__profitReadiness.source,state:window.__profitReadiness.state,coverage:window.__profitReadiness.coverage}:null},
   localData:{settings:localDataSettings(),reportManifest:{currentId:currentResearchReport?.id||null},archive:localArchive},portfolioV3:{settings:portfolioV3Settings()},ui:{pwaInstallDismissed:localStorage.getItem("pwaInstallDismissed")||null}
 };
 try{const raw=JSON.stringify(data),checksum=await sha256Text(raw),bundle={schemaVersion:54,algorithm:"SHA-256",checksum,payload:data};downloadTextFile("crypto-radar-v71-full-backup.json",JSON.stringify(bundle,null,2),"application/json");toast(`Full backup exported · ${localArchive.records.length} IDB records`,"good")}catch(e){toast(`Backup failed: ${e.message}`,"bad")}
}
async function importBackup(file){
 if(!file)return;
 try{
   const txt=await file.text(),parsed=JSON.parse(txt);if(!parsed||typeof parsed!=="object")throw Error("invalid");let d=parsed;if(parsed.payload&&parsed.checksum){const raw=JSON.stringify(parsed.payload),sum=await sha256Text(raw);if(sum!==parsed.checksum)throw Error("backup checksum mismatch");d=parsed.payload}
   if(d.settings)putSettings(d.settings);
   if(Array.isArray(d.journal))setJournal(d.journal);
   if(Array.isArray(d.paper))setPaperTrades(d.paper.map(paperMigrateTrade));
   if(d.paperSettings)localStorage.setItem(PAPER_SETTINGS_KEY,JSON.stringify({...paperSettings(),...d.paperSettings}));
   if(Array.isArray(d.paperEquity))localStorage.setItem(PAPER_EQUITY_KEY,JSON.stringify(d.paperEquity.slice(-500)));
   if(d.forwardValidationStart)localStorage.setItem("forwardValidationStart",String(d.forwardValidationStart));
   if(Array.isArray(d.alerts))putAlerts(d.alerts);
   const w=d.watchlists||{};
   if(Array.isArray(w.favorites))localStorage.setItem("favorites",JSON.stringify(w.favorites));
   else if(Array.isArray(d.favorites))localStorage.setItem("favorites",JSON.stringify(d.favorites));
   if(Array.isArray(w.favoritesStocks))localStorage.setItem("favsStocks",JSON.stringify(w.favoritesStocks));
   if(Array.isArray(w.recent))localStorage.setItem("recent",JSON.stringify(w.recent));
   else if(Array.isArray(d.recent))localStorage.setItem("recent",JSON.stringify(d.recent));
   if(Array.isArray(w.recentStocks))localStorage.setItem("recentStocks",JSON.stringify(w.recentStocks));
   if(d.scanPrefs&&typeof d.scanPrefs==="object")localStorage.setItem(SCAN_PREF_KEY,JSON.stringify(d.scanPrefs));
   if(d.portfolioBudgets&&typeof d.portfolioBudgets==="object")localStorage.setItem(PORT_BUDGET_KEY,JSON.stringify({...portfolioBudgetSettings(),...d.portfolioBudgets}));
   if(Array.isArray(d.researchGovernance?.experiments))setExperimentRegistry(d.researchGovernance.experiments);
   if(Array.isArray(d.researchGovernance?.modelVersions))setModelVersions(d.researchGovernance.modelVersions);
   if(d.researchGovernance?.activeModelVersionId)localStorage.setItem(ACTIVE_MODEL_VERSION_KEY,String(d.researchGovernance.activeModelVersionId));
   if(d.researchGovernance?.metaEnsembleV2&&typeof d.researchGovernance.metaEnsembleV2==="object")localStorage.setItem(META_ENSEMBLE_V2_KEY,JSON.stringify(d.researchGovernance.metaEnsembleV2));
   if(Array.isArray(d.decisionCore?.observedLiquidations)){localStorage.setItem(LIQ_HISTORY_KEY,JSON.stringify(d.decisionCore.observedLiquidations.slice(-500)));localDbPutMany("liquidations",d.decisionCore.observedLiquidations,x=>`${x.ts}|${x.symbol}|${x.price}|${x.side}`,x=>x.ts).catch(()=>{})}
   if(d.localData?.settings&&typeof d.localData.settings==="object")localStorage.setItem(LOCAL_DATA_SETTINGS_KEY,JSON.stringify({...localDataSettings(),...d.localData.settings}));
   if(d.portfolioV3?.settings&&typeof d.portfolioV3.settings==="object")localStorage.setItem(PORT_V3_SETTINGS_KEY,JSON.stringify({...portfolioV3Settings(),...d.portfolioV3.settings}));
   if(d.profitReadiness?.prefs&&typeof d.profitReadiness.prefs==="object"){const raw=JSON.stringify(d.profitReadiness.prefs);if(appSettings().privacySessionOnly)sessionStorage.setItem(PROFIT_READY_PREF_KEY,raw);else localStorage.setItem(PROFIT_READY_PREF_KEY,raw)}
   if(d.profitReadiness?.oos&&typeof d.profitReadiness.oos==="object"){const raw=JSON.stringify(d.profitReadiness.oos);if(appSettings().privacySessionOnly)sessionStorage.setItem(PROFIT_READY_OOS_KEY,raw);else localStorage.setItem(PROFIT_READY_OOS_KEY,raw)}
   const ws=d.workspace||{};
   if(ws.assetClass)localStorage.setItem("assetClass",ws.assetClass);
   if(ws.analysisProvider)localStorage.setItem("analysisProvider",ws.analysisProvider);
   if(ws.mode||d.mode)localStorage.setItem("mode",ws.mode||d.mode);
   if(ws.lastCrypto)localStorage.setItem("lastCrypto",ws.lastCrypto);
   if(ws.lastStock)localStorage.setItem("lastStock",ws.lastStock);
   if(d.ui?.pwaInstallDismissed!=null)localStorage.setItem("pwaInstallDismissed",String(d.ui.pwaInstallDismissed));
   if(Array.isArray(d.localData?.archive?.records)){for(const r of d.localData.archive.records)if(r?.type&&r?.id!=null)await localDbPutRecord(r.type,r.id,r.data,r.ts)}
   if(Array.isArray(d.localData?.archive?.reports))for(const r of d.localData.archive.reports)if(r?.id)await localReportPut(r);
   restoreMetaEnsembleV2();loadScanPrefs();renderLists();renderSignals();renderPaper();renderSettings();renderAlerts();renderMetaEnsembleV2();renderProfitReadiness(false);toast(`Backup imported · ${d.version||"legacy"} → v57`,"good")
 }catch(e){toast("Invalid backup file","bad")}
}
async function deleteLocalResearchDb(){
 try{const db=await localDbOpen().catch(()=>null);if(db)db.close();localDbPromise=null;if(!localDbSupported())return true;await new Promise((resolve,reject)=>{const req=indexedDB.deleteDatabase(LOCAL_DB_NAME);req.onsuccess=resolve;req.onerror=()=>reject(req.error);req.onblocked=resolve});return true}catch{return false}
}
async function resetWorkspace(){
 if(!confirm("Reset local settings, journal, paper execution state, alerts, watchlists and the v57 local research archive?"))return;
 for(const k of ["radarSettings","signalJournal","paperTrades","paperAccountSettings","paperEquityHistory","radarAlerts","favorites","favsStocks","recent","recentStocks","mode","forwardValidationStart","assetClass","analysisProvider","lastCrypto","lastStock","last",SCAN_PREF_KEY,PORT_BUDGET_KEY,EXP_REGISTRY_KEY,MODEL_VERSION_KEY,ACTIVE_MODEL_VERSION_KEY,LIQ_HISTORY_KEY,TRUE_FLOW_HISTORY_KEY,LOCAL_DATA_SETTINGS_KEY,PORT_V3_SETTINGS_KEY,META_ENSEMBLE_V2_KEY,PROFIT_READY_PREF_KEY,PROFIT_READY_OOS_KEY])localStorage.removeItem(k);
 await deleteLocalResearchDb();location.reload()
}

function forwardStart(){return Number(localStorage.getItem("forwardValidationStart")||0)}
function startForwardValidation(){
 if(forwardStart()&&!confirm("A forward cohort already exists. Restart it now?"))return;
 localStorage.setItem("forwardValidationStart",String(Date.now()));renderForwardLab();toast("Forward cohort started","good")
}
function resetForwardValidation(){
 if(!confirm("Reset the forward cohort start date? Existing journal records remain unchanged."))return;
 localStorage.removeItem("forwardValidationStart");renderForwardLab();toast("Forward cohort reset","warn")
}
function statPack(vals){
 let n=vals.length,sum=vals.reduce((a,b)=>a+b,0),gp=vals.filter(x=>x>0).reduce((a,b)=>a+b,0),gl=-vals.filter(x=>x<0).reduce((a,b)=>a+b,0);
 return {n,avg:n?sum/n:0,pf:gl?gp/gl:gp?99:0,dd:n?maxDrawdownR(vals):0,win:n?vals.filter(x=>x>0).length/n:0}
}
function calibrationGap(rows){
 const buckets=[[60,64],[65,69],[70,74],[75,79],[80,100]];let total=0,weighted=0;
 for(const [a,b] of buckets){let z=rows.filter(x=>{let c=Math.max(+x.longConf||0,+x.shortConf||0);return c>=a&&c<=b&&Number.isFinite(metricR(x))});if(!z.length)continue;let observed=z.filter(x=>metricR(x)>0).length/z.length*100,pred=z.reduce((q,x)=>q+Math.max(+x.longConf||0,+x.shortConf||0),0)/z.length;weighted+=Math.abs(pred-observed)*z.length;total+=z.length}
 return total?weighted/total:NaN
}
function segmentReliability(symbol,tf,mode,regime){
 const h=hierarchicalReliability(symbol,tf,mode,regime,analysisSource()),n=h.exact.n,shrunkHit=h.shrunkHit,shrunkExp=h.shrunkExp,evidence=Math.min(1,h.global.n/30)*Math.min(1,(n+6)/18);
 let adj=Math.max(-8,Math.min(8,((shrunkHit-.5)*20+shrunkExp*4)*evidence));
 const base=appSettings().signalMin,suggested=Math.max(60,Math.min(76,Math.round(base-adj*.45)));
 return {n,shrunkHit,shrunkExp,adj,suggested,hierarchy:h}
}
function riskGuard(){
 const vals=recentChronological(analysisSource(),20).map(x=>x.r),st=statPack(vals);let state="NORMAL",mult=1,reason="No material deterioration detected in recent cost-aware outcomes.";
 if(vals.length<10){state="LEARNING";mult=.5;reason="Fewer than 10 recent resolved outcomes; keep validation size small."}
 else if(st.dd<=-10||st.avg<=-.25){state="PAUSE";mult=0;reason="Recent drawdown/expectancy breached the research pause threshold."}
 else if(st.dd<=-6||st.avg<0){state="CAUTION";mult=.5;reason="Recent evidence is weaker; reduce research risk and gather more samples."}
 return {state,mult,reason,stats:st}
}
function renderForwardLab(){
 const src=analysisSource(),start=forwardStart(),all=journal().filter(x=>(x.source||"BINANCE")===src),fwd=start?all.filter(x=>x.ts>=start):[],resolved=chronologicalRows(fwd.filter(x=>Number.isFinite(metricR(x)))),vals=resolved.map(x=>metricR(x)),st=statPack(vals);
 $("forwardStarted").textContent=start?new Date(start).toLocaleString():"—";$("forwardResolved").textContent=st.n;$("forwardExpectancy").textContent=st.n?st.avg.toFixed(2)+" R":"—";$("forwardPf").textContent=st.n?st.pf.toFixed(2):"—";$("forwardDd").textContent=st.n?st.dd.toFixed(2)+" R":"—";$("forwardWin").textContent=st.n?(st.win*100).toFixed(1)+"%":"—";
 let state="NOT STARTED",why="Start a forward cohort to separate future evidence from historical tuning.",cl="neutral";
 if(start){state=st.n<20?"COLLECTING":st.avg>0&&st.pf>=1.2?"FORWARD POSITIVE":st.avg<=0||st.pf<1?"FORWARD DEGRADED":"FORWARD MIXED";why=st.n<20?"Collect at least 20 resolved forward outcomes before interpreting the cohort.":state==="FORWARD POSITIVE"?"Forward-only cost-aware evidence is positive; keep collecting before scaling.":state==="FORWARD DEGRADED"?"Forward-only evidence is currently weak after costs.":"Forward-only evidence is mixed and needs more observations.";cl=state==="FORWARD POSITIVE"?"good":state==="FORWARD DEGRADED"?"bad":"neutral"}
 $("forwardState").textContent=state;$("forwardState").className="forwardState "+cl;$("forwardWhy").textContent=why;
 const g=riskGuard();$("guardState").textContent=g.state;$("guardState").className=g.state==="NORMAL"?"guardNormal":g.state==="PAUSE"?"guardPause":"guardCaution";$("guardExpectancy").textContent=g.stats.n?g.stats.avg.toFixed(2)+" R":"—";$("guardDd").textContent=g.stats.n?g.stats.dd.toFixed(2)+" R":"—";$("guardRisk").textContent=g.mult.toFixed(2)+"×";$("guardReason").textContent=g.reason;
 const stt=window.__radarState;if(stt){let r=segmentReliability(stt.symbol,stt.tf,stt.mode,stt.q.regime);$("segN").textContent=r.n;$("segHit").textContent=(r.shrunkHit*100).toFixed(1)+"%";$("segExp").textContent=r.shrunkExp.toFixed(2)+" R";$("segAdj").textContent=(r.adj>=0?"+":"")+r.adj.toFixed(1)+" pts";$("segThreshold").textContent=r.suggested}else{$("segN").textContent=0;$("segHit").textContent=$("segExp").textContent=$("segAdj").textContent=$("segThreshold").textContent="—"}
 const resolvedAll=all.filter(x=>Number.isFinite(metricR(x))),attrib=resolvedAll.filter(x=>Number.isFinite(x.trendScore)&&Number.isFinite(x.mtf)).length,amb=all.filter(x=>x.status==="AMBIGUOUS").length,oor=all.filter(x=>x.status==="OUT_OF_RANGE").length,gap=calibrationGap(all);
 const br=v64ForwardBreadthStats(resolved);$("forwardBreadthN").textContent=br.n;$("forwardBreadthBull").textContent=br.bull.n?`${br.bull.avg.toFixed(2)} R · N${br.bull.n}`:"—";$("forwardBreadthNeutral").textContent=br.neutral.n?`${br.neutral.avg.toFixed(2)} R · N${br.neutral.n}`:"—";$("forwardBreadthBear").textContent=br.bear.n?`${br.bear.avg.toFixed(2)} R · N${br.bear.n}`:"—";$("qualityAttrib").textContent=resolvedAll.length?(attrib/resolvedAll.length*100).toFixed(0)+"%":"—";$("qualityAmb").textContent=all.length?(amb/all.length*100).toFixed(1)+"%":"—";$("qualityOor").textContent=all.length?(oor/all.length*100).toFixed(1)+"%":"—";$("qualityCal").textContent=Number.isFinite(gap)?gap.toFixed(1)+" pp":"—";renderProfitReadiness(false)
}


const PROFIT_READY_PREF_KEY="profitReadinessV57",PROFIT_READY_OOS_KEY="profitReadinessOosV57";
function prMarketOf(x){return x?.market||((x?.source||"BINANCE")==="TWELVEDATA"?"STOCKS":"CRYPTO")}
function prRows(market=assetClass(),source=analysisSource()){
  return chronologicalRows(researchJournalRows().filter(x=>Number.isFinite(metricR(x))&&prMarketOf(x)===market&&(!source||(x.source||"BINANCE")===source)).map(x=>({...x,r:metricR(x)})))
}
// v74.6: IC 95% al asteptarii (bootstrap pe blocuri, samanta fixa - acelasi
// rezultat la fiecare rulare). Portile cer limita de JOS > 0, nu media: o
// medie de +0,10R cu zgomot de ±3R nu dovedeste nimic.
function prExpCi(vals){if(!vals||vals.length<10)return [NaN,NaN];const n=vals.length,m=[];for(const ix of movingBlockBootstrapIndices(n,400,5)){let s=0;for(const i of ix)s+=vals[i];m.push(s/n)}return ci95(m)}
function prCiText(st){return Array.isArray(st.expCi)&&Number.isFinite(st.expCi[0])?` · IC95 [${st.expCi[0].toFixed(2)}; ${st.expCi[1].toFixed(2)}]`:" · IC95 —"}
function prExpDovedit(st){return Array.isArray(st.expCi)&&Number.isFinite(st.expCi[0])&&st.expCi[0]>0}
function prStats(rows){const vals=(rows||[]).map(x=>Number.isFinite(x.r)?x.r:metricR(x)).filter(Number.isFinite),st={...statPack(vals),expCi:prExpCi(vals)},ts=(rows||[]).map(x=>+x.ts||0).filter(x=>x>0).sort((a,b)=>a-b),spanDays=ts.length>1?(ts.at(-1)-ts[0])/86400000:0,regimes=new Map(),tfs=new Map();for(const x of rows||[]){const rg=typeof canonicalRegime==="function"?canonicalRegime(x):String(x.regime||"UNKNOWN"),tf=String(x.tf||"?");regimes.set(rg,(regimes.get(rg)||0)+1);tfs.set(tf,(tfs.get(tf)||0)+1)}return {...st,spanDays,regimes:[...regimes.entries()],regimeN:[...regimes.values()].filter(n=>n>=10).length,tfN:[...tfs.values()].filter(n=>n>=10).length}}
function prPaperStats(market=assetClass(),source=analysisSource()){
  const rows=paperTrades().map(paperMigrateTrade).filter(t=>paperTerminalStatus(t)&&(+t.qtyFilled||0)>0&&(+t.riskUsd||0)>0&&prMarketOf(t)===market&&(!source||(t.source||"BINANCE")===source)).map(t=>({...t,r:(+t.realizedUsd||0)/(+t.riskUsd||1),ts:+t.opened||+t.created||+t.ts||0})).sort((a,b)=>a.ts-b.ts);return {...prStats(rows),rows}
}
function prPrefStore(){try{const raw=appSettings().privacySessionOnly?sessionStorage.getItem(PROFIT_READY_PREF_KEY):localStorage.getItem(PROFIT_READY_PREF_KEY);return JSON.parse(raw||"{}")||{}}catch{return {}}}
function prProviderKey(market=assetClass(),source=analysisSource()){return `${market}|${source}`}
function profitProviderVerified(market=assetClass(),source=analysisSource()){return !!prPrefStore()[prProviderKey(market,source)]}
function setProfitProviderVerified(v){const x=prPrefStore();x[prProviderKey()]=!!v;if(!appSettings().privacySessionOnly)localStorage.setItem(PROFIT_READY_PREF_KEY,JSON.stringify(x));else sessionStorage.setItem(PROFIT_READY_PREF_KEY,JSON.stringify(x));renderProfitReadiness(false)}
function prOosStore(){try{const raw=appSettings().privacySessionOnly?sessionStorage.getItem(PROFIT_READY_OOS_KEY):localStorage.getItem(PROFIT_READY_OOS_KEY);return JSON.parse(raw||"{}")||{}}catch{return {}}}
function prOosKey(market=assetClass(),source=analysisSource(),symbol=null,tf=null,mode=null){const st=window.__radarState;return [market,source,symbol||st?.symbol||(market==="STOCKS"?stockSymbol($("symbol")?.value||""):norm($("symbol")?.value||"")),tf||st?.tf||$("tf")?.value||"?",mode||st?.mode||$("mode")?.value||"auto"].join("|")}
function saveProfitReadinessOos(row){if(!row)return false;const x=prOosStore();x[prOosKey(row.market,row.source,row.symbol,row.tf,row.mode)]=row;const raw=JSON.stringify(x);if(appSettings().privacySessionOnly)sessionStorage.setItem(PROFIT_READY_OOS_KEY,raw);else localStorage.setItem(PROFIT_READY_OOS_KEY,raw);window.__profitReadinessOos=row;return true}
function currentProfitReadinessOos(){const x=prOosStore(),row=x[prOosKey()];return row||null}
function prGate(id,label,pass,current,requirement){return {id,label,pass:!!pass,current:String(current??"—"),requirement:String(requirement||"")}}
function prModelGate(){
  let state="NO MODEL",usable=false,disagreement=NaN;if(metaEnsembleV2?.models){const d=ensembleCurrentPrediction();state=d.state||metaEnsembleV2.state||"MODEL";disagreement=d.disagreement;usable=state==="USABLE ENSEMBLE"&&Number.isFinite(disagreement)&&disagreement<=(metaEnsembleV2.config||ensembleV2Config()).maxDisagreement}else if(metaLabelState){state=metaLabelState.state||"MODEL";usable=state==="USABLE"}
  const drift=driftSnapshot?.state||"NO TEST";return {state,usable:usable&&drift==="STABLE",drift,disagreement}
}
function profitMarketEvidence(market,source=null){const rows=prRows(market,source),s=prStats(rows),start=forwardStart(),f=prStats(start?rows.filter(x=>(+x.ts||0)>=start):[]),p=prPaperStats(market,source);let state="NOT READY";if(s.n>=40&&s.avg>0&&s.pf>=1.10&&s.dd>=-15)state="PAPER EVIDENCE +";if(s.n>=150&&s.avg>=.10&&s.pf>=1.25&&f.n>=60&&f.avg>=.08&&f.pf>=1.25&&p.n>=50&&p.avg>=.05&&p.pf>=1.20)state="MATURE EVIDENCE";return {market,source,rows,stats:s,forward:f,paper:p,state}}
function profitReadinessSnapshot(market=assetClass(),source=analysisSource()){
  const rows=prRows(market,source),stats=prStats(rows),start=forwardStart(),forward=prStats(start?rows.filter(x=>(+x.ts||0)>=start):[]),paper=prPaperStats(market,source),recent=prStats(rows.slice(-20)),providerVerified=profitProviderVerified(market,source),st=window.__radarState,currentMatch=!!(st&&assetClass()===market&&(st.source||analysisSource())===source),quality=currentMatch?masterDataQuality():NaN,model=currentMatch?prModelGate():{state:"N/A",usable:false,drift:"NO TEST",disagreement:NaN},oos=currentMatch?currentProfitReadinessOos():null,oosAge=oos?Date.now()-(+oos.ts||0):Infinity,oosPass=!!(oos&&oos.pass&&oosAge<=14*86400000),online=typeof navigator==="undefined"?true:navigator.onLine!==false;
  const paperGates=[
    prGate("sample40","Resolved cost-aware sample",stats.n>=40,stats.n,"≥ 40"),
    prGate("exp0","Net expectancy positive (IC95)",stats.n>=40&&prExpDovedit(stats),stats.n?stats.avg.toFixed(2)+" R"+prCiText(stats):"—","IC95 jos > 0 R"),
    prGate("pf110","Profit factor floor",stats.n>=40&&stats.pf>=1.10,stats.n?stats.pf.toFixed(2):"—","≥ 1.10"),
    prGate("dd15","Drawdown containment",stats.n>=40&&stats.dd>=-15,stats.n?stats.dd.toFixed(2)+" R":"—","≥ -15 R"),
    prGate("span7","Evidence time span",stats.spanDays>=7,stats.spanDays.toFixed(1)+" d","≥ 7 days"),
    prGate("recent10","Recent sample not materially degraded",recent.n>=10&&recent.avg>-.15,recent.n?`${recent.n} · ${recent.avg.toFixed(2)} R`:"—","N≥10 and exp > -0.15R")
  ];
  const liveGates=[
    prGate("sample150","Resolved cost-aware sample",stats.n>=150,stats.n,"≥ 150"),
    prGate("exp010","Net expectancy (IC95)",stats.n>=150&&stats.avg>=.10&&prExpDovedit(stats),stats.n?stats.avg.toFixed(2)+" R"+prCiText(stats):"—","≥ +0.10 R și IC95 jos > 0"),
    prGate("pf125","Profit factor",stats.n>=150&&stats.pf>=1.25,stats.n?stats.pf.toFixed(2):"—","≥ 1.25"),
    prGate("dd10","Max drawdown",stats.n>=150&&stats.dd>=-10,stats.n?stats.dd.toFixed(2)+" R":"—","≥ -10 R"),
    prGate("span30","Evidence time span",stats.spanDays>=30,stats.spanDays.toFixed(1)+" d","≥ 30 days"),
    prGate("forward60","Forward resolved sample",forward.n>=60,forward.n,"≥ 60"),
    prGate("forwardExp","Forward expectancy (IC95)",forward.n>=60&&forward.avg>=.08&&prExpDovedit(forward),forward.n?forward.avg.toFixed(2)+" R"+prCiText(forward):"—","≥ +0.08 R și IC95 jos > 0"),
    prGate("forwardPf","Forward profit factor",forward.n>=60&&forward.pf>=1.25,forward.n?forward.pf.toFixed(2):"—","≥ 1.25"),
    prGate("paper50","Completed Paper executions",paper.n>=50,paper.n,"≥ 50"),
    prGate("paperExp","Paper expectancy (IC95)",paper.n>=50&&paper.avg>=.05&&prExpDovedit(paper),paper.n?paper.avg.toFixed(2)+" R"+prCiText(paper):"—","≥ +0.05 R și IC95 jos > 0"),
    prGate("paperPf","Paper profit factor",paper.n>=50&&paper.pf>=1.20,paper.n?paper.pf.toFixed(2):"—","≥ 1.20"),
    prGate("paperDd","Paper max drawdown",paper.n>=50&&paper.dd>=-8,paper.n?paper.dd.toFixed(2)+" R":"—","≥ -8 R"),
    prGate("regimes3","Regime diversity",stats.regimeN>=3,stats.regimeN,"≥ 3 regimes with N≥10"),
    prGate("recent20","Recent 20 expectancy",recent.n>=20&&recent.avg>=0,recent.n?recent.avg.toFixed(2)+" R":"—","N=20 and exp ≥ 0"),
    prGate("oos","Fresh positive OOS current setup",oosPass,oos?`${oos.n} · ${oos.avg.toFixed(2)}R · PF ${oos.pf.toFixed(2)}`:"NOT RUN","N≥20, exp>0, PF≥1.20, ≤14d"),
    prGate("model","Model evidence + stable drift",model.usable,`${model.state} · ${model.drift}`,"USABLE + STABLE"),
    prGate("quality","Current data quality",Number.isFinite(quality)&&quality>=80,Number.isFinite(quality)?quality.toFixed(0)+"/100":"RUN ANALYSIS","≥ 80/100"),
    prGate("provider","Live provider/deployment manually confirmed",providerVerified&&online,providerVerified?(online?"CONFIRMED":"OFFLINE"):"NOT CONFIRMED","confirmed + online")
  ];
  const paperPass=paperGates.every(x=>x.pass),livePass=paperPass&&liveGates.every(x=>x.pass),state=livePass?"SMALL LIVE READY":paperPass?"PAPER READY":"NOT READY",coverage=liveGates.filter(x=>x.pass).length/liveGates.length*100,paperCoverage=paperGates.filter(x=>x.pass).length/paperGates.length*100,next=(paperPass?liveGates:paperGates).find(x=>!x.pass)||null;
  const currentVerdict=window.__masterVerdict?.verdict||"NO CURRENT VERDICT",headline=state==="SMALL LIVE READY"?"Strict evidence eligibility passed; profit is still not predicted.":state==="PAPER READY"?"Paper gate passed; live-capital evidence is still incomplete.":"Evidence is not mature enough for live capital.",action=state==="SMALL LIVE READY"?"The readiness gate passed. A current trade still requires its own Master Verdict and risk limits.":state==="PAPER READY"?"Continue Paper + Forward validation until every Small Live gate passes.":"Stay in research/Paper mode and clear the failed Paper gates first.";
  return {ts:Date.now(),market,source,state,coverage,paperCoverage,next,headline,action,stats,forward,paper,recent,paperGates,liveGates,oos,oosPass,model,quality,providerVerified,online,currentVerdict}
}
function prCriterionHtml(g){return `<div class="prCriterion ${g.pass?"pass":"fail"}"><div class="prIcon">${g.pass?"✓":"×"}</div><b>${escapeHtml(g.label)}</b><div class="prCurrentVal">${escapeHtml(g.current)}</div><div class="small">${escapeHtml(g.requirement)}</div></div>`}
function prStateClass(state){return state==="SMALL LIVE READY"?"prLiveReady":state==="PAPER READY"?"prPaperReady":"prNotReady"}
function renderProfitReadiness(showToast=false){
  const x=profitReadinessSnapshot();window.__profitReadiness=x;const cls=prStateClass(x.state),pct=Math.round(x.coverage),next=x.next?.label||"All gates passed";
  for(const id of ["prState","prDashState"]){const el=$(id);if(el){el.textContent=x.state;el.className=`prState ${cls}`}}
  if($("prHeadline"))$("prHeadline").textContent=x.headline;if($("prAction"))$("prAction").textContent=x.action;if($("prDashReason"))$("prDashReason").textContent=x.action;if($("prBar"))$("prBar").style.width=pct+"%";if($("prDashBar"))$("prDashBar").style.width=pct+"%";if($("prCoverage"))$("prCoverage").textContent=`${pct}% · paper ${Math.round(x.paperCoverage)}%`;if($("prDashCoverage"))$("prDashCoverage").textContent=pct+"%";
  if($("prMarket"))$("prMarket").textContent=`${x.market==="STOCKS"?"US STOCKS / NASDAQ":x.market} · ${x.source}`;if($("prCurrentVerdict"))$("prCurrentVerdict").textContent=x.currentVerdict;if($("prProviderState"))$("prProviderState").textContent=x.providerVerified?(x.online?"CONFIRMED":"CONFIRMED · OFFLINE"):"NOT CONFIRMED";if($("prLiveVerified"))$("prLiveVerified").checked=x.providerVerified;
  const set=(id,v)=>{if($(id))$(id).textContent=v};set("prN",x.stats.n);set("prExp",x.stats.n?x.stats.avg.toFixed(2)+" R":"—");set("prPf",x.stats.n?x.stats.pf.toFixed(2):"—");set("prDd",x.stats.n?x.stats.dd.toFixed(2)+" R":"—");set("prSpan",x.stats.spanDays.toFixed(1)+" d");set("prRecent",x.recent.n?`${x.recent.n} · ${x.recent.avg.toFixed(2)} R`:"—");set("prForward",`${x.forward.n} · ${x.forward.n?x.forward.avg.toFixed(2)+" R":"—"}`);set("prForwardPf",x.forward.n?x.forward.pf.toFixed(2):"—");set("prPaper",`${x.paper.n} · ${x.paper.n?x.paper.avg.toFixed(2)+" R":"—"}`);set("prPaperPf",x.paper.n?`${x.paper.pf.toFixed(2)} · ${x.paper.dd.toFixed(2)} R`:"—");set("prRegimes",`${x.stats.regimeN} eligible`);set("prOos",x.oosPass?`PASS · N${x.oos.n}`:x.oos?`FAIL/STALE · N${x.oos.n}`:"NOT RUN");set("prModel",`${x.model.state} · ${x.model.drift}`);set("prQuality",Number.isFinite(x.quality)?x.quality.toFixed(0)+"/100":"RUN ANALYSIS");
  set("prDashN",x.stats.n);set("prDashExp",x.stats.n?x.stats.avg.toFixed(2)+" R":"—");set("prDashPf",x.stats.n?x.stats.pf.toFixed(2):"—");set("prDashForward",x.forward.n);set("prDashPaper",x.paper.n);set("prDashNext",next);
  if($("prPaperGates"))$("prPaperGates").innerHTML=x.paperGates.map(prCriterionHtml).join("");if($("prLiveGates"))$("prLiveGates").innerHTML=x.liveGates.map(prCriterionHtml).join("");
  const crypto=profitMarketEvidence("CRYPTO",null),stocks=profitMarketEvidence("STOCKS","TWELVEDATA");set("prCryptoEvidence",crypto.state);set("prCryptoDetail",`N ${crypto.stats.n} · exp ${crypto.stats.n?crypto.stats.avg.toFixed(2):"—"}R · PF ${crypto.stats.n?crypto.stats.pf.toFixed(2):"—"} · forward ${crypto.forward.n} · paper ${crypto.paper.n}`);set("prStockEvidence",stocks.state);set("prStockDetail",`N ${stocks.stats.n} · exp ${stocks.stats.n?stocks.stats.avg.toFixed(2):"—"}R · PF ${stocks.stats.n?stocks.stats.pf.toFixed(2):"—"} · forward ${stocks.forward.n} · paper ${stocks.paper.n}`);
  if(localDbSupported()&&!appSettings().privacySessionOnly){const b=Math.floor(x.ts/300000),compact={ts:x.ts,market:x.market,source:x.source,state:x.state,coverage:x.coverage,paperCoverage:x.paperCoverage,n:x.stats.n,avg:x.stats.avg,pf:x.stats.pf,dd:x.stats.dd,forwardN:x.forward.n,forwardAvg:x.forward.avg,forwardPf:x.forward.pf,paperN:x.paper.n,paperAvg:x.paper.avg,paperPf:x.paper.pf,oosPass:x.oosPass,model:x.model.state,drift:x.model.drift,quality:x.quality,providerVerified:x.providerVerified};localDbPutRecord("profit_readiness",`${b}|${x.market}|${x.source}`,compact,x.ts).catch(()=>{})}
  if(showToast)toast(`Readiness: ${x.state} · ${pct}% live-gate coverage`,x.state==="SMALL LIVE READY"?"good":x.state==="PAPER READY"?"warn":"bad");return x
}

async function rollingPoints(){
 const sym=norm($("symbol").value),tf=$("tf").value,mode=$("mode").value,src=analysisSource(),j=(window.__radarState&&window.__radarState.symbol===sym&&window.__radarState.tf===tf&&window.__radarState.source===src)?window.__radarState.j:await analysisKlines(sym,tf,750,src),horizon=mode==="scalp"?4:mode==="swing"?12:6,points=[];
 for(let i=240;i<j.length-horizon-1;i+=horizon){let q=calc(j.slice(0,i+1),mode),future=j.slice(i+1,i+1+horizon);points.push({score:q.score,atr:q.atr,entry:+j[i+1][1],future,eventStartTs:+j[i+1][0]||0,eventEndTs:+future.at(-1)?.[0]||0,horizon})}
 return points
}
async function runRollingOos(){
 const box=$("foldTable"),cfg=appSettings();box.innerHTML='<div class="emptyState">Running rolling OOS…</div>';
 try{
  const points=await rollingPoints(),thresholds=[60,64,68,72],folds=[],cuts=[.45,.60,.75];
  for(let f=0;f<3;f++){let trainEnd=Math.floor(points.length*cuts[f]),testEnd=f<2?Math.floor(points.length*cuts[f+1]):points.length,best=64,bestAvg=-Infinity;
   for(const th of thresholds){let tr=statsR(wfTrade(points,th,cfg,0,trainEnd));if(tr.n>=20&&tr.avg>bestAvg){best=th;bestAvg=tr.avg}}
   let vals=wfTrade(points,best,cfg,trainEnd,testEnd),st=statsR(vals);folds.push({fold:f+1,best,...st,vals})
  }
  box.innerHTML=`<div class="foldRow"><div class="foldCell">Fold</div><div class="foldCell">Threshold</div><div class="foldCell">N</div><div class="foldCell">Exp.</div><div class="foldCell">PF</div><div class="foldCell">DD</div></div>`+folds.map(x=>`<div class="foldRow"><div class="foldCell">${x.fold}</div><div class="foldCell">${x.best}</div><div class="foldCell">${x.n}</div><div class="foldCell ${x.avg>=0?"mxGood":"mxBad"}">${x.n?x.avg.toFixed(2):"—"}</div><div class="foldCell">${x.n?x.pf.toFixed(2):"—"}</div><div class="foldCell">${x.n?x.dd.toFixed(2):"—"}</div></div>`).join("");
  const all=folds.flatMap(x=>x.vals),st=statsR(all);$("foldN").textContent=st.n;$("foldExp").textContent=st.n?st.avg.toFixed(2)+" R":"—";$("foldPf").textContent=st.n?st.pf.toFixed(2):"—";$("foldDd").textContent=st.n?st.dd.toFixed(2)+" R":"—"
 }catch(e){box.innerHTML=`<div class="emptyState">Rolling OOS unavailable: ${escapeHtml(e.message)}</div>`}
}

const requestCache=new Map();
const requestInflight=new Map();
const perfStats={cacheHits:0,cacheMisses:0,inflightHits:0,pionexCacheHits:0,wsReconnects:0,lastScanner:"IDLE"};
function cacheKey(prefix,key){return prefix+"|"+key}
function cacheGet(k,ttl){
 const x=requestCache.get(k);if(!x)return null;
 if(Date.now()-x.ts>ttl){requestCache.delete(k);return null}
 perfStats.cacheHits++;return x.value
}
function cachePut(k,value){requestCache.set(k,{ts:Date.now(),value});return value}
async function memoRequest(k,ttl,fn){
 const hit=cacheGet(k,ttl);if(hit!==null)return hit;
 perfStats.cacheMisses++;
 if(requestInflight.has(k)){perfStats.inflightHits++;return requestInflight.get(k)}
 const p=(async()=>{try{return cachePut(k,await fn())}finally{requestInflight.delete(k)}})();
 requestInflight.set(k,p);return p
}
function clearExpiredRequestCache(maxAge=300000){
 const now=Date.now();for(const [k,v] of requestCache)if(now-v.ts>maxAge)requestCache.delete(k)
}
setInterval(()=>clearExpiredRequestCache(),120000);
let dialogReturnFocus=null;function focusDialog(id){const p=$(id);if(!p)return;dialogReturnFocus=document.activeElement;setTimeout(()=>{const f=p.querySelector("button,input,select,textarea,[tabindex]:not([tabindex=\"-1\"])");(f||p).focus()},0)}
function restoreDialogFocus(){const x=dialogReturnFocus;dialogReturnFocus=null;if(x?.focus)setTimeout(()=>x.focus(),0)}
function openMoreDrawer(){$("moreDrawer").classList.add("on");focusDialog("moreDrawer")}
function closeMoreDrawer(){$("moreDrawer").classList.remove("on");restoreDialogFocus()}
function moreNav(id,load=false){closeMoreDrawer();navTo(id,load)}
function withTimeout(p,ms,label="request"){
 return new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error(label+" timeout")),ms);Promise.resolve(p).then(v=>{clearTimeout(t);resolve(v)},e=>{clearTimeout(t);reject(e)})})
}
async function retryTask(fn,retries=1,baseDelay=180){
 let last;for(let i=0;i<=retries;i++){try{return await fn(i)}catch(e){last=e;if(i<retries)await sleep(baseDelay*(i+1))}}throw last
}
async function runPool(items,worker,concurrency,onProgress,token){
 let next=0,done=0,out=new Array(items.length),errors=0;
 async function runner(){
   while(true){
     if(token.cancelled)return;
     const i=next++;if(i>=items.length)return;
     try{out[i]=await worker(items[i],i)}catch(e){out[i]=null;errors++}
     done++;if(onProgress)onProgress(done,items.length,out,errors)
   }
 }
 await Promise.all(Array.from({length:Math.max(1,concurrency)},runner));
 return {results:out.filter(Boolean),errors,cancelled:token.cancelled}
}
const SCAN_PREF_KEY="pionexScanPrefs";
function saveScanPrefs(){
 const ids=["scanDir","scanRegime","scanAdx","scanScore","scanDepth","scanSearch","scanSort"],o={};
 for(const id of ids)if($(id))o[id]=$(id).value;
 localStorage.setItem(SCAN_PREF_KEY,JSON.stringify(o))
}
function loadScanPrefs(){
 try{const o=JSON.parse(localStorage.getItem(SCAN_PREF_KEY)||"{}");for(const [id,v] of Object.entries(o))if($(id))$(id).value=v}catch{}
 if($("pionexScanMode")&&$("scanDepth"))$("pionexScanMode").textContent=$("scanDepth").value==="DEEP"?"Mode DEEP MTF":"Mode FAST 4H"
}

// v74.6: versiunea are O SINGURA sursa - <meta name="app-version"> din
// index.html (o urca livrarea). Inainte era scrisa aici de mana si ramasese
// "v71" in antet si in Health la v74.5.
const APP_VERSION=(typeof document!=="undefined"&&document.querySelector('meta[name="app-version"]')?.content)||"v?";
// document.getElementById, nu $: aici $ (const, mai jos in fisier) e inca in zona moarta.
function aplicaVersiunea(){for(const id of ["antetVersiune","topVersiune","sideVersiune","healthAppVersion"]){const el=document.getElementById(id);if(el)el.textContent=/^v[\d.?]+/.test(el.textContent)?el.textContent.replace(/^v[\d.?]+/,APP_VERSION):APP_VERSION}}
if(typeof document!=="undefined")aplicaVersiunea();
let researchWorkerInstance=null,researchWorkerSeq=0;const researchWorkerPending=new Map();
function researchWorkerSupported(){return typeof Worker!=="undefined"}
function ensureResearchWorker(){
  if(!researchWorkerSupported())return null;if(researchWorkerInstance)return researchWorkerInstance;
  const w=new Worker("/research-worker.js");w.onmessage=e=>{const m=e.data||{},p=researchWorkerPending.get(m.id);if(!p)return;researchWorkerPending.delete(m.id);clearTimeout(p.timer);m.ok?p.resolve(m.result):p.reject(Error(m.error||"Research worker failed"))};w.onerror=e=>{for(const [id,p] of researchWorkerPending){clearTimeout(p.timer);p.reject(Error(e.message||"Research worker error"));researchWorkerPending.delete(id)};try{w.terminate()}catch{}researchWorkerInstance=null};researchWorkerInstance=w;return w
}
function researchWorkerTask(type,payload,timeout=45000){
  const w=ensureResearchWorker();if(!w)return Promise.reject(Error("Web Worker unavailable"));const id=++researchWorkerSeq;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{researchWorkerPending.delete(id);reject(Error(`Research worker timeout: ${type}`))},timeout);researchWorkerPending.set(id,{resolve,reject,timer});w.postMessage({id,type,payload})})
}
function mlSampleWeight(r){return Number.isFinite(+r?.weight)?clamp(+r.weight,.2,3):Number.isFinite(+r?.utility)?clamp(Math.abs(+r.utility),.25,3):1}
function mlWorkerRows(rows){return (rows||[]).map(r=>({vals:r.vals,label:r.label,utility:r.utility,weight:mlSampleWeight(r)}))}
async function trainLogisticOffMain(train,l2=.02,epochs=420,lr=.08){try{return modelFromParams(await researchWorkerTask("trainLogistic",{train:mlWorkerRows(train),l2,epochs,lr}))}catch{return trainLogistic(train,l2,epochs,lr)}}
async function trainElasticOffMain(train,l1=.01,l2=.015,epochs=480,lr=.06){try{return modelFromParams(await researchWorkerTask("trainElastic",{train:mlWorkerRows(train),l1,l2,epochs,lr}))}catch{return trainElasticNetLogistic(train,l1,l2,epochs,lr)}}
async function trainStumpsOffMain(train,rounds=24,shrink=.22,minLeaf=7){try{return restoreBoostedStumps(await researchWorkerTask("trainStumps",{train:mlWorkerRows(train),rounds,shrink,minLeaf}))}catch{return trainBoostedStumps(train,rounds,shrink,minLeaf)}}
const mlAutoTrainingLocks={meta:false,ensemble:false};
async function runAutoTrainingLocked(kind,fn){if(mlAutoTrainingLocks[kind])return null;mlAutoTrainingLocks[kind]=true;try{return await fn()}finally{mlAutoTrainingLocks[kind]=false}}
let deferredInstallPrompt=null,pwaWaitingWorker=null;
function isStandalonePwa(){return window.matchMedia&&window.matchMedia("(display-mode: standalone)").matches||window.navigator.standalone===true}
function showPwaInstall(){
 let inchisDeOm=false;try{inchisDeOm=localStorage.getItem("pwaInstallDismissed")==="1"}catch{}
 if(isStandalonePwa()||inchisDeOm)return;
 if($("pwaInstallCard"))$("pwaInstallCard").classList.add("on")
}
function dismissPwaInstall(){try{localStorage.setItem("pwaInstallDismissed","1")}catch{}if($("pwaInstallCard"))$("pwaInstallCard").classList.remove("on")}
async function installPwa(){
 if(deferredInstallPrompt){
   deferredInstallPrompt.prompt();try{await deferredInstallPrompt.userChoice}catch{}
   deferredInstallPrompt=null;if($("pwaInstallCard"))$("pwaInstallCard").classList.remove("on");return
 }
 if(/iphone|ipad|ipod/i.test(navigator.userAgent||""))toast("Pe iPhone/iPad: Share → Add to Home Screen","good");
 else toast("Folosește meniul browserului → Install app / Add to Home screen","good")
}
function dismissPwaUpdate(){if($("pwaUpdateBanner"))$("pwaUpdateBanner").classList.remove("on")}
function applyPwaUpdate(){if(pwaWaitingWorker){pwaWaitingWorker.postMessage({type:"SKIP_WAITING"})}else location.reload()}
function pwaHandleRegistration(reg){
 if(reg.waiting){pwaWaitingWorker=reg.waiting;if($("pwaUpdateBanner"))$("pwaUpdateBanner").classList.add("on")}
 reg.addEventListener("updatefound",()=>{
   const nw=reg.installing;if(!nw)return;
   nw.addEventListener("statechange",()=>{
     if(nw.state==="installed"&&navigator.serviceWorker.controller){pwaWaitingWorker=nw;if($("pwaUpdateBanner"))$("pwaUpdateBanner").classList.add("on")}
   })
 })
}
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredInstallPrompt=e;showPwaInstall()});
window.addEventListener("appinstalled",()=>{deferredInstallPrompt=null;localStorage.removeItem("pwaInstallDismissed");if($("pwaInstallCard"))$("pwaInstallCard").classList.remove("on");toast("Crypto Radar instalat","good")});
navigator.serviceWorker?.addEventListener("controllerchange",()=>location.reload());
function pwaInitDeepLink(){
 const q=new URLSearchParams(location.search),panel=q.get("panel");
 if(panel&&document.getElementById(panel))setTimeout(()=>navTo(panel,true),120)
}
function renderPwaHealth(){
 if($("healthPwaMode"))$("healthPwaMode").textContent=isStandalonePwa()?"INSTALLED":"BROWSER";
 if($("healthAppVersion"))$("healthAppVersion").textContent=APP_VERSION
}

function clamp(v,a=0,b=100){return Math.max(a,Math.min(b,v))}
function gradeClass(g){return g==="A"?"gradeA":g==="B"?"gradeB":g==="C"?"gradeC":"gradeD"}
function researchGrade(score){return score>=80?"A":score>=70?"B":score>=60?"C":"D"}
function pfFromVals(vals){let gp=vals.filter(x=>x>0).reduce((a,b)=>a+b,0),gl=-vals.filter(x=>x<0).reduce((a,b)=>a+b,0);return gl?gp/gl:gp?99:0}
function journalReliabilityForCoin(c,regime=null,src="PIONEX"){
 const mode=$("mode")?.value||"auto",sym=norm(c),rows=journal().filter(x=>(x.source||"BINANCE")===src&&x.symbol===sym&&x.mode===mode&&Number.isFinite(metricR(x)));
 let z=regime?rows.filter(x=>x.regime===regime):rows;if(z.length<15)z=rows;
 const n=z.length,vals=z.map(metricR),wins=vals.filter(x=>x>0).length,avg=n?vals.reduce((a,b)=>a+b,0)/n:0,priorN=12;
 return {n,hit:(wins+priorN*.5)/(n+priorN),exp:(n/(n+priorN))*avg,pf:pfFromVals(vals)}
}
function turnoverPercentile(v){
 const a=(scannerRows||[]).map(x=>+x.turnover||0).sort((a,b)=>a-b);if(!a.length)return 50;
 return 100*a.filter(x=>x<=v).length/a.length
}
function opportunityScore(row){
 const strength=clamp(Math.abs((+row.avg||50)-50)*2),conf=clamp(+row.conf||50),adxQ=clamp((+row.adx||0)/40*100),structure=clamp(row.structure??50),volume=clamp(row.volume??50),liq=turnoverPercentile(+row.turnover||0);
 const chop=Number.isFinite(+row.chop)?+row.chop:50,eff=Number.isFinite(+row.efficiency)?+row.efficiency:.3;
 const regimeQ=clamp(55+(row.regime?.includes("TREND")?12:0)+(chop<45?10:chop>62?-15:0)+(eff>.45?10:eff<.2?-10:0));
 const rel=journalReliabilityForCoin(row.c,row.regime,row.source||"PIONEX"),relScore=clamp(50+(rel.hit-.5)*50+rel.exp*12);
 let score=.22*strength+.16*conf+.12*adxQ+.12*structure+.08*volume+.10*liq+.10*regimeQ+.10*relScore;
 const breadthAlign=v64BreadthAlignment(row.dir),breadthAdj=Number.isFinite(breadthAlign)?Math.max(-4,Math.min(4,breadthAlign*4)):0;score+=breadthAdj;
 let microAdj=0;
 const ms=window.__microState;if(ms&&ms.symbol===row.pionexSymbol&&ms.composite){
   const m=ms.composite.score,aligned=(row.dir==="BULLISH"&&m>15)||(row.dir==="BEARISH"&&m<-15),opposed=(row.dir==="BULLISH"&&m<-15)||(row.dir==="BEARISH"&&m>15);
   microAdj=aligned?5:opposed?-5:0;score+=microAdj
 }
 score=clamp(score);
 let blocker="None";
 if(row.dir==="NEUTRAL")blocker="Neutral direction";
 else if(conf<58)blocker="Low confidence";
 else if(chop>64&&adxQ<55)blocker="Choppy / weak trend";
 else if(liq<15)blocker="Low relative liquidity";
 else if(rel.n>=20&&rel.exp<0)blocker="Negative empirical expectancy";
 return {...row,oppScore:score,grade:researchGrade(score),strength,liq,regimeQ,reliability:rel,microAdj,breadthAdj,blocker,netREst:rel.n>=20?rel.exp:null}
}
function rankedOpportunities(){return (scannerRows||[]).map(opportunityScore).sort((a,b)=>b.oppScore-a.oppScore||b.turnover-a.turnover)}
function opportunityRowHtml(x,rank){
 return `<div class="oppRow"><div class="oppCell">${rank}</div><div class="oppCell coinCell" data-action-click="selectOpportunity(&#x27;${x.c}&#x27;,&#x27;${x.source||"PIONEX"}')">${x.c}</div><div class="oppCell ${gradeClass(x.grade)}">${x.grade} · ${x.oppScore.toFixed(0)}</div><div class="oppCell">${x.dir}</div><div class="oppCell">${x.reliability.n?x.reliability.n+" n":"—"}</div><div class="oppCell">${Number.isFinite(x.netREst)?x.netREst.toFixed(2)+"R":"—"}</div><div class="oppCell">${x.blocker}</div></div>`
}
function selectOpportunity(c,source="BINANCE"){
  if(source==="TWELVEDATA")setAssetClass("STOCKS");
  else{setAssetClass("CRYPTO");setAnalysisSource("BINANCE")}
  $("symbol").value=c;if(source==="TWELVEDATA")localStorage.setItem("lastStock",c);else localStorage.setItem("lastCrypto",c);
  show("dash");toast(`${c} selectat din Opportunity Engine · ${source==="TWELVEDATA"?"Twelve Data":"Binance"}`,"good");analyze(true)
}
function renderOpportunity(){
 const rows=rankedOpportunities(),box=$("opportunityTop10");if(box)box.innerHTML=rows.length?`<div class="oppRow"><div class="oppCell">#</div><div class="oppCell">Coin</div><div class="oppCell">Grade</div><div class="oppCell">Bias</div><div class="oppCell">Rel N</div><div class="oppCell">Net R est.</div><div class="oppCell">Blocker</div></div>`+rows.slice(0,10).map((x,i)=>opportunityRowHtml(x,i+1)).join(""):`<div class="emptyState">Run Pionex scanner first.</div>`;
 renderSetupQuality();renderDailyDesk()
}
function setupQualityCurrent(){
 const st=window.__radarState,ss=window.__signalState;if(!st||!ss)return null;const q=st.q,sm=ss.sm,tm=ss.tm;
 const trend=clamp((q.trendScore+q.momScore)/2),entry=clamp(55+q.structureScore*.25+(q.smc?.trap?-25:10)),liq=clamp(q.volScore==null?(q.smc?.trap?25:70):q.volScore*.65+(q.smc?.trap?25:70)*.35);
 const entryPx=(tm.entryLow+tm.entryHigh)/2,risk=Math.abs(entryPx-tm.stop),reward=Math.abs(tm.tp2-entryPx),rr=risk?reward/risk:0,riskQ=clamp(rr/2.2*100);
 let micro=50,ms=window.__microState;if(assetClass()==="CRYPTO"&&ms&&ms.symbol===`${coin(st.symbol)}_USDT`&&ms.composite){let v=ms.composite.score;micro=clamp(50+(tm.direction==="LONG"?v:-v)*.5)}
 const fresh=Date.now()-(dataFresh.rest||0),data=clamp(100-(fresh>120000?35:fresh>60000?20:0)-(st.source!==analysisSource()?20:0));
 let earningsPenalty=0,earningsDays=null;
 if(assetClass()==="STOCKS"&&window.__stockEarnings&&window.__stockEarnings.symbol===stockSymbol(st.symbol)&&window.__stockEarnings.date){const d0=new Date().setHours(0,0,0,0),de=Date.parse(window.__stockEarnings.date+"T00:00:00"),days=Math.round((de-d0)/86400000);earningsDays=days;if(days>=0&&days<=2)earningsPenalty=10}
 const overall=clamp(.24*trend+.18*entry+.15*liq+.18*riskQ+.15*micro+.10*data-earningsPenalty),grade=researchGrade(overall);
 let blocker="None";if(tm.direction==="WAIT")blocker="No directional setup";else if(earningsDays!=null&&earningsDays>=0&&earningsDays<=2)blocker=`Earnings risk · ${earningsDays}d`;else if(Math.max(sm.long,sm.short)<appSettings().signalMin)blocker="Confidence below threshold";else if(q.smc?.trap)blocker="Liquidity trap";else if(riskQ<50)blocker="Weak risk/reward";else if(micro<35)blocker="Microstructure opposed";
 const rel=journalReliabilityForCoin(coin(st.symbol),q.regime,st.source||analysisSource());
 return {trend,entry,liq,risk:riskQ,micro,data,overall,grade,blocker,netR:rel.n>=20?rel.exp:null,relN:rel.n,earningsDays}
}
function setQuality(id,val){if($(id))$(id).textContent=Math.round(val)+"/100";const m=$(id.replace(/^sq/,"sqm"));if(m)m.style.width=clamp(val)+"%"}
function renderSetupQuality(){
 const z=setupQualityCurrent();if(!z){if($("setupGradeBadge"))$("setupGradeBadge").textContent="NO SETUP";return}
 $("setupGradeBadge").textContent=`GRADE ${z.grade} · ${z.overall.toFixed(0)}`;$("setupGradeBadge").className="validationBadge "+gradeClass(z.grade);
 setQuality("sqTrend",z.trend);setQuality("sqEntry",z.entry);setQuality("sqLiquidity",z.liq);setQuality("sqRisk",z.risk);setQuality("sqMicro",z.micro);setQuality("sqData",z.data);
 $("setupBlocker").textContent=z.blocker;$("setupNetR").textContent=Number.isFinite(z.netR)?`${z.netR.toFixed(2)} R · ${z.relN} n`:"Insufficient empirical sample"
}
function renderDailyDesk(){
 const q=window.__radarState?.q,g=riskGuard(),ps=paperAccountStats(),rows=rankedOpportunities(),active=journal().filter(x=>["NEW","WAITING_ENTRY","ENTRY","TP1","TP2"].includes(x.status)).length;
 const marketRows=marketCache.rows||[],bull=marketRows.filter(x=>x.q&&x.q.score>=55).length,breadth=marketRows.length?bull/marketRows.length*100:null;
 $("deskRegime").textContent=q?regimeFusion(q).state:"—";$("deskBreadth").textContent=Number.isFinite(breadth)?breadth.toFixed(0)+"% bullish":"—";$("deskSignals").textContent=active;$("deskGuard").textContent=g.state;$("deskEquity").textContent=ps?money(ps.equity):"—";$("deskPush").textContent=window.__pushState||"LOCAL";
 const sq=setupQualityCurrent();$("deskGrade").textContent=sq?`GRADE ${sq.grade} · ${sq.overall.toFixed(0)}`:"—";$("deskGrade").className="edgeState "+(sq&&sq.grade==="A"?"good":sq&&sq.grade==="D"?"bad":"neutral");$("deskBlocker").textContent=sq?sq.blocker:"—";$("deskSource").textContent=analysisSource();$("deskAccount").textContent=assetClass()==="STOCKS"?"N/A · STOCK MODE":window.__pionexAccountConfigured?"READ-ONLY CONNECTED":"NOT CONFIGURED";
 const box=$("deskTop5");if(box)box.innerHTML=rows.length?`<div class="oppRow"><div class="oppCell">#</div><div class="oppCell">Coin</div><div class="oppCell">Grade</div><div class="oppCell">Bias</div><div class="oppCell">Rel N</div><div class="oppCell">Net R est.</div><div class="oppCell">Blocker</div></div>`+rows.slice(0,5).map((x,i)=>opportunityRowHtml(x,i+1)).join(""):`<div class="emptyState">Run the current market scanner to generate ranked opportunities.</div>`;
 $("deskNote").textContent=`${new Date().toLocaleDateString()} · research desk · rankings are probabilistic and cost-aware where journal evidence exists.`
}
function calibrationEngine(){
 const src=analysisSource(),r=resolvedR(src),buckets=[[55,59],[60,64],[65,69],[70,74],[75,79],[80,100]],rows=[];let brier=0,ece=0,total=0;
 for(const [a,b] of buckets){const z=r.filter(x=>{let c=Math.max(+x.longConf||0,+x.shortConf||0);return c>=a&&c<=b});if(!z.length){rows.push({range:`${a}-${b}`,n:0});continue}
   const pred=z.reduce((q,x)=>q+Math.max(+x.longConf||0,+x.shortConf||0)/100,0)/z.length,win=z.filter(x=>x.r>0).length,obs=win/z.length,shrunk=(win+5)/(z.length+10),avgR=z.reduce((q,x)=>q+x.r,0)/z.length,pf=pfFromVals(z.map(x=>x.r));
   rows.push({range:`${a}-${b}`,n:z.length,pred,obs,shrunk,avgR,pf});ece+=Math.abs(pred-obs)*z.length;total+=z.length;for(const x of z){let p=Math.max(+x.longConf||0,+x.shortConf||0)/100,y=x.r>0?1:0;brier+=(p-y)**2}
 }
 const candidates=[60,64,68,72,76],cand=candidates.map(th=>{let z=r.filter(x=>Math.max(+x.longConf||0,+x.shortConf||0)>=th),vals=z.map(x=>x.r);return {th,n:z.length,avg:z.length?vals.reduce((a,b)=>a+b,0)/z.length:0,pf:pfFromVals(vals)}}).filter(x=>x.n>=30&&x.avg>0&&x.pf>=1.1).sort((a,b)=>b.avg-a.avg);
 return {n:r.length,brier:r.length?brier/r.length:NaN,ece:total?ece/total:NaN,rows,suggested:cand[0]?.th||null}
}
function renderCalibrationLab(){
 const c=calibrationEngine();$("calResolvedN").textContent=c.n;$("calBrier").textContent=Number.isFinite(c.brier)?c.brier.toFixed(3):"—";$("calEce").textContent=Number.isFinite(c.ece)?(c.ece*100).toFixed(1)+" pp":"—";$("calSuggested").textContent=c.suggested??"—";$("calStatus").textContent=c.n<30?"LEARNING":c.ece<=.10?"USABLE SAMPLE":"MISCALIBRATED";
 $("calibrationTable").innerHTML=`<div class="calRow2"><div class="calCell2">Confidence</div><div class="calCell2">N</div><div class="calCell2">Pred.</div><div class="calCell2">Observed</div><div class="calCell2">Shrunk</div><div class="calCell2">Avg R</div></div>`+c.rows.map(x=>`<div class="calRow2"><div class="calCell2">${x.range}</div><div class="calCell2">${x.n||0}</div><div class="calCell2">${x.n?(x.pred*100).toFixed(0)+"%":"—"}</div><div class="calCell2">${x.n?(x.obs*100).toFixed(0)+"%":"—"}</div><div class="calCell2">${x.n?(x.shrunk*100).toFixed(0)+"%":"—"}</div><div class="calCell2">${x.n?x.avgR.toFixed(2):"—"}</div></div>`).join("");
 renderMicroValidation()
}
function microAlignment(x){
 if(!Number.isFinite(+x.microScore))return "NEUTRAL";const m=+x.microScore;if(Math.abs(m)<15)return "NEUTRAL";
 if((x.direction==="LONG"&&m>0)||(x.direction==="SHORT"&&m<0))return "ALIGNED";return "OPPOSED"
}
function microGroupStats(rows){const vals=rows.map(metricR).filter(Number.isFinite),n=vals.length,avg=n?vals.reduce((a,b)=>a+b,0)/n:0,wr=n?vals.filter(x=>x>0).length/n*100:0;return {n,avg,wr,pf:pfFromVals(vals)}}
function renderMicroValidation(){
 const r=journal().filter(x=>(x.source||"BINANCE")==="PIONEX"&&Number.isFinite(metricR(x))),groups={ALIGNED:[],NEUTRAL:[],OPPOSED:[]};r.forEach(x=>groups[microAlignment(x)].push(x));
 const a=microGroupStats(groups.ALIGNED),n=microGroupStats(groups.NEUTRAL),o=microGroupStats(groups.OPPOSED);
 $("microValAligned").textContent=a.n?a.avg.toFixed(2)+" R":"—";$("microValAlignedSub").textContent=`${a.n} n · ${a.n?a.wr.toFixed(0):0}% win`;
 $("microValNeutral").textContent=n.n?n.avg.toFixed(2)+" R":"—";$("microValNeutralSub").textContent=`${n.n} n · ${n.n?n.wr.toFixed(0):0}% win`;
 $("microValOpposed").textContent=o.n?o.avg.toFixed(2)+" R":"—";$("microValOpposedSub").textContent=`${o.n} n · ${o.n?o.wr.toFixed(0):0}% win`;
 $("microValidationNote").textContent=a.n<20?"Need at least 20 resolved Pionex signals with aligned microstructure before treating confirmation as evidence.":a.avg>n.avg?"Aligned microstructure currently has higher sample expectancy; continue forward validation before changing base weights.":"Current sample does not show a clear microstructure uplift; base weights remain unchanged."
}
function money(v){return Number(v||0).toLocaleString(undefined,{style:"currency",currency:"USD",maximumFractionDigits:2})}
const PAPER_SETTINGS_KEY="paperAccountSettings",PAPER_EQUITY_KEY="paperEquityHistory";
function paperSettings(){const d={startingCapital:10000,riskPct:.5,maxDailyLossPct:2,maxWeeklyLossPct:4,maxDdPct:8,maxExposurePct:100,leverage:1,entryType:"LIMIT",fillModel:"CONSERVATIVE",maxWaitBars:8,entryLayers:3,tp1Pct:35,tp2Pct:30,breakEvenR:1,trailMode:"ATR",trailStartR:1.5,trailAtrMult:1.5,maxPositionBars:48,volStopAtrMult:2.25,maxPositions:6};try{return {...d,...JSON.parse(localStorage.getItem(PAPER_SETTINGS_KEY)||"{}")}}catch{return d}}
function savePaperSettings(){
 const tp=String($("paperTpPlan")?.value||"35/30").split("/").map(Number),x={startingCapital:+$("paperStartCapital").value||10000,riskPct:+$("paperRiskPct").value||.5,maxDailyLossPct:+$("paperMaxDaily").value||2,maxWeeklyLossPct:+$("paperMaxWeekly").value||4,maxDdPct:+$("paperMaxDd").value||8,maxExposurePct:+$("paperMaxExposure").value||100,leverage:+$("paperLeverage").value||1,entryType:$("paperEntryType")?.value||"LIMIT",fillModel:$("paperFillModel")?.value||"CONSERVATIVE",maxWaitBars:+$("paperMaxWaitBars")?.value||8,entryLayers:Math.max(1,Math.min(3,+$("paperEntryLayers")?.value||3)),tp1Pct:Math.max(0,Math.min(80,tp[0]||35)),tp2Pct:Math.max(0,Math.min(80,tp[1]||30)),breakEvenR:Math.max(0,+$("paperBreakEvenR")?.value||1),trailMode:$("paperTrailMode")?.value||"ATR",trailStartR:Math.max(0,+$("paperTrailStartR")?.value||1.5),trailAtrMult:Math.max(.25,+$("paperTrailAtr")?.value||1.5),maxPositionBars:Math.max(1,+$("paperMaxPositionBars")?.value||48),volStopAtrMult:Math.max(.5,+$("paperVolStopAtr")?.value||2.25),maxPositions:Math.max(1,+$("paperMaxPositions")?.value||6)};localStorage.setItem(PAPER_SETTINGS_KEY,JSON.stringify(x));renderPaper();toast("Paper Trading v3 risk + execution settings saved","good")
}
function paperHistory(){try{return JSON.parse(localStorage.getItem(PAPER_EQUITY_KEY)||"[]")}catch{return []}}
function recordPaperEquity(equity){
 if(appSettings().privacySessionOnly)return;let a=paperHistory(),last=a[a.length-1];if(!last||Date.now()-last.ts>60000||Math.abs(last.equity-equity)>.01){a.push({ts:Date.now(),equity});localStorage.setItem(PAPER_EQUITY_KEY,JSON.stringify(a.slice(-500)))}
}
function paperTradeUnreal(t){
 paperMigrateTrade(t);if((+t.qtyOpen||0)<=0)return 0;const qty=+t.qtyOpen,p=+t.last||+t.entry,dir=t.direction==="LONG"?1:-1;return dir*(p-(+t.entry))*qty
}
function paperAccountStats(){
 const cfg=paperSettings(),a=paperTrades().map(paperMigrateTrade),real=a.reduce((z,t)=>z+(+t.realizedUsd||0),0),unreal=a.reduce((z,t)=>z+paperTradeUnreal(t),0),equity=cfg.startingCapital+real+unreal,exposure=a.filter(paperPositionActive).reduce((z,t)=>z+(+t.last||+t.entry)*(+t.qtyOpen||0),0),reservedExposure=a.filter(paperEntryPending).reduce((z,t)=>z+Math.max(0,(+t.qtyTarget||0)-(+t.qtyFilled||0))*(+t.plannedEntry||+t.entry||0),0),margin=exposure/Math.max(1,cfg.leverage);
 const now=new Date(),startDay=new Date(now);startDay.setHours(0,0,0,0);const startWeek=new Date(now),dow=(startWeek.getDay()+6)%7;startWeek.setDate(startWeek.getDate()-dow);startWeek.setHours(0,0,0,0);
 let daily=0,weekly=0;for(const t of a){for(const e of (t.events||[])){if(!Number.isFinite(+e.pnlUsd))continue;if(e.ts>=+startDay)daily+=+e.pnlUsd;if(e.ts>=+startWeek)weekly+=+e.pnlUsd}}
 const hist=paperHistory(),vals=[...hist.map(x=>+x.equity),equity].filter(Number.isFinite);let peak=-Infinity,dd=0;for(const v of vals){peak=Math.max(peak,v);dd=Math.min(dd,v-peak)}const ddPct=peak>0?Math.abs(dd)/peak*100:0,positions=a.filter(paperPositionActive),pending=a.filter(paperEntryPending);
 return {cfg,real,unreal,equity,exposure,reservedExposure,margin,daily,weekly,dd,ddPct,peak,positions,pending}
}

function statsRows(rows){
 const vals=rows.map(x=>Number.isFinite(x.r)?x.r:metricR(x)).filter(Number.isFinite),n=vals.length,sum=vals.reduce((a,b)=>a+b,0),wins=vals.filter(x=>x>0).length,gp=vals.filter(x=>x>0).reduce((a,b)=>a+b,0),gl=-vals.filter(x=>x<0).reduce((a,b)=>a+b,0);
 return {n,vals,avg:n?sum/n:0,win:n?wins/n:0,pf:gl?gp/gl:gp?99:0,dd:n?maxDrawdownR(vals):0}
}
function hierarchicalReliability(symbol,tf,mode,regime,src=analysisSource()){
 const all=resolvedChronological(src),layer=(fn)=>all.filter(fn),global=statsRows(all),tfMode=statsRows(layer(x=>x.tf===tf&&x.mode===mode)),reg=statsRows(layer(x=>x.tf===tf&&x.mode===mode&&x.regime===regime)),exact=statsRows(layer(x=>x.symbol===symbol&&x.tf===tf&&x.mode===mode&&x.regime===regime));
 const blend=(parent,child,priorN)=>({avg:(child.avg*child.n+parent.avg*priorN)/(child.n+priorN||1),win:(child.win*child.n+parent.win*priorN)/(child.n+priorN||1)});
 let a={avg:global.avg,win:global.win},b=blend(a,tfMode,20),c=blend(b,reg,15),d=blend(c,exact,12);
 return {global,tfMode,reg,exact,shrunkExp:d.avg,shrunkHit:d.win}
}
function strategyLifecycle(){
 const st=window.__radarState;if(!st)return {state:"LEARNING",mult:.5,reason:"Run analysis first.",stats:{n:0,avg:0,pf:0}};
 const src=st.source||analysisSource(),h=hierarchicalReliability(st.symbol,st.tf,st.mode,st.q.regime,src),z=h.exact;
 let state="LEARNING",mult=.5,reason="Exact segment needs more resolved outcomes.";
 if(z.n>=20&&(z.avg<=0||z.pf<.9)){state="RETIRED";mult=0;reason="Exact segment has enough observations and currently fails the net expectancy / PF floor."}
 else if(z.n>=30&&z.avg>=.15&&z.pf>=1.25){state="PROMOTED";mult=1;reason="Exact segment cleared the sample, expectancy and PF promotion gates."}
 else if(z.n>=15){state="WATCH";mult=.65;reason="Segment has usable evidence but has not cleared promotion or retirement gates."}
 const start=forwardStart();if(start){const f=chronologicalRows(journal().filter(x=>(x.source||"BINANCE")===src&&x.symbol===st.symbol&&x.tf===st.tf&&x.mode===st.mode&&x.regime===st.q.regime&&x.ts>=start&&Number.isFinite(metricR(x)))).map(x=>({...x,r:metricR(x)})),fs=statsRows(f);if(fs.n>=20&&fs.avg<=0){state="RETIRED";mult=0;reason="Forward exact-segment sample is non-positive after costs."}}
 return {state,mult,reason,stats:z,hier:h}
}
function paperCircuitBreaker(){
 const a=paperAccountStats(),cfg=a.cfg,day=a.daily+Math.min(0,a.unreal),week=a.weekly+Math.min(0,a.unreal),dayLim=cfg.startingCapital*cfg.maxDailyLossPct/100,weekLim=cfg.startingCapital*cfg.maxWeeklyLossPct/100,ddLim=cfg.maxDdPct;
 let state="NORMAL",mult=1,reason="Paper loss limits are inside configured bounds.";
 if(day<=-dayLim||week<=-weekLim||a.ddPct>=ddLim){state="PAUSE";mult=0;reason="Daily, weekly or equity drawdown circuit breaker has been reached."}
 else if(day<=-.75*dayLim||week<=-.75*weekLim||a.ddPct>=.75*ddLim){state="CAUTION";mult=.5;reason="Paper account is within 25% of a configured loss limit."}
 return {state,mult,reason,day,week,ddPct:a.ddPct}
}
function adaptivePaperRiskMultiplier(){
 const st=window.__radarState,g=riskGuard(),life=strategyLifecycle(),cb=paperCircuitBreaker(),governor=typeof v61RiskGovernor==="function"?v61RiskGovernor():{mult:g.mult,state:g.state,reason:g.reason};let vol=1,corr=1,cluster=1,budget=1,tail=1;
 if(st?.q){const rv=+st.q.rvPercentile||50,ch=+st.q.chop||50;if(rv>=90)vol=.55;else if(rv>=75)vol=.75;if(ch>=65)vol=Math.min(vol,.75)}
 if(appSettings().enableExperimentalVolRisk&&window.__volatilityIntel&&Number.isFinite(+window.__volatilityIntel.riskMultiplier))vol=Math.min(vol,+window.__volatilityIntel.riskMultiplier);
 const pr=window.__portfolioRisk;
 if(pr){
   if(pr.avgAbsCorr>=.75||pr.largestShare>=.50)corr=.65;else if(pr.avgAbsCorr>=.6||pr.largestShare>=.4)corr=.8;
   if(pr.largestClusterShare>=.65||pr.largestComponentShare>=.55)cluster=.65;else if(pr.largestClusterShare>=.50||pr.largestComponentShare>=.40)cluster=.8;
   if(pr.budgetState==="BLOCK")budget=0;else if(pr.budgetState==="WATCH")budget=.7
 }
 if(window.__portfolioV3?.state==="HIGH")tail=Math.min(tail,.65);else if(window.__portfolioV3?.state==="WATCH")tail=Math.min(tail,.82);
 if(window.__portfolioStress?.state==="SEVERE")tail=0;else if(window.__portfolioStress?.state==="HIGH")tail=Math.min(tail,.50);else if(window.__portfolioStress?.state==="WATCH")tail=Math.min(tail,.75);
 const mult=Math.max(0,Math.min(1,governor.mult*life.mult*cb.mult*vol*corr*cluster*budget*tail));
 return {mult,guard:g.mult,governor:governor.mult,governorState:governor.state,lifecycle:life.mult,circuit:cb.mult,vol,corr,cluster,budget,tail,life,cb}
}
function renderStrategyLifecycle(){
 const x=strategyLifecycle(),el=$("lifeState");if(!el)return;el.textContent=x.state;el.className="lifeState "+(x.state==="PROMOTED"?"lifePromoted":x.state==="RETIRED"?"lifeRetired":x.state==="WATCH"?"lifeWatch":"lifeLearning");
 $("lifeN").textContent=x.stats.n;$("lifeExp").textContent=x.stats.n?x.stats.avg.toFixed(2)+" R":"—";$("lifePf").textContent=x.stats.n?x.stats.pf.toFixed(2):"—";$("lifeMult").textContent=x.mult.toFixed(2)+"×";$("lifeReason").textContent=x.reason
}
function paramWfTrade(points,p,cfg,start,end){
 const vals=[];for(let z=start;z<end;z++){const x=points[z],dir=x.score>=p.threshold?1:x.score<=100-p.threshold?-1:0;if(!dir)continue;const risk=Math.max(x.atr*p.stopMult,x.entry*.003),stop=x.entry-dir*risk,target=x.entry+dir*risk*p.targetR;let hit=null;
   for(const b of x.future){const hi=+b[2],lo=+b[3],sh=dir>0?lo<=stop:hi>=stop,th=dir>0?hi>=target:lo<=target;if(sh&&th){hit=-1;break}if(th){hit=p.targetR;break}if(sh){hit=-1;break}}
   if(hit==null)continue;const rf=risk/x.entry,costR=rf?2*(cfg.feeBps+cfg.slippageBps)*p.costMult/10000/rf:0;vals.push(hit-costR)
 }return vals
}
async function runRobustnessLab(){
 const box=$("robustTable"),base=Math.max(55,Math.min(80,+$("robBaseThreshold").value||64)),embargo=Math.max(0,+$("robEmbargo").value||6),minN=Math.max(20,+$("robMinTrades").value||20),stress=Math.max(1,+$("robCostStress").value||1.5),cfg=appSettings();box.innerHTML='<div class="emptyState">Running embargoed perturbation grid…</div>';
 try{
   const points=await rollingPoints(),split=Math.floor(points.length*.60),testStart=Math.min(points.length,split+embargo),ths=[base-4,base,base+4],stops=[1.25,1.5,1.75],targets=[1.5,2,2.5],costs=[1,stress],rows=[];
   for(const threshold of ths)for(const stopMult of stops)for(const targetR of targets)for(const costMult of costs){const vals=paramWfTrade(points,{threshold,stopMult,targetR,costMult},cfg,testStart,points.length),st=statsR(vals);if(st.n>=minN)rows.push({threshold,stopMult,targetR,costMult,...st})}
   if(!rows.length)throw Error("No perturbation variant has the minimum trade count.");
   const avgs=rows.map(x=>x.avg),pfs=rows.map(x=>x.pf),positive=rows.filter(x=>x.avg>0&&x.pf>=1).length/rows.length,med=percentile(avgs,.5),worst=Math.min(...avgs),medPf=percentile(pfs,.5);
   let state=positive>=.7&&med>0&&worst>-.25?"ROBUST":positive>=.5&&med>0?"MIXED POSITIVE":"FRAGILE";
   $("robVariants").textContent=rows.length;$("robPositive").textContent=(positive*100).toFixed(0)+"%";$("robMedian").textContent=med.toFixed(2)+" R";$("robWorst").textContent=worst.toFixed(2)+" R";$("robPf").textContent=medPf.toFixed(2);$("robState").textContent=state;$("robState").className=state==="ROBUST"?"good":state==="FRAGILE"?"bad":"neutral";
   const shown=[...rows].sort((a,b)=>b.avg-a.avg).slice(0,15);box.innerHTML=`<div class="robustRow"><div class="robustCell">Variant</div><div class="robustCell">Threshold</div><div class="robustCell">Stop ATR</div><div class="robustCell">Target R</div><div class="robustCell">Cost</div><div class="robustCell">N</div><div class="robustCell">Exp / PF</div></div>`+shown.map((x,i)=>`<div class="robustRow"><div class="robustCell">#${i+1}</div><div class="robustCell">${x.threshold}</div><div class="robustCell">${x.stopMult.toFixed(2)}</div><div class="robustCell">${x.targetR.toFixed(1)}</div><div class="robustCell">${x.costMult.toFixed(1)}×</div><div class="robustCell">${x.n}</div><div class="robustCell ${x.avg>=0?"good":"bad"}">${x.avg.toFixed(2)} / ${x.pf.toFixed(2)}</div></div>`).join("");
   $("robustNote").textContent=`OOS begins after a ${embargo}-bar embargo. ${rows.length} variants cleared N≥${minN}; ${(positive*100).toFixed(0)}% were positive after modeled costs. The table shows best variants for inspection; do not treat the best row as an optimized forecast.`;
   renderStrategyLifecycle()
 }catch(e){box.innerHTML=`<div class="emptyState">Robustness unavailable: ${escapeHtml(e.message)}</div>`;$("robState").textContent="N/A"}
}
function portfolioReturnsSeries(seriesMap,positions){
 const lengths=positions.map(p=>seriesMap[p.symbol]?.length||0).filter(Boolean);if(!lengths.length)return [];const n=Math.min(...lengths)-1;if(n<20)return [];
 const gross=positions.reduce((a,p)=>a+p.notional,0)||1,out=[];for(let k=n;k>=1;k--){let pr=0;for(const p of positions){const a=seriesMap[p.symbol],i=a.length-k-1,j=i+1;if(i<0||j>=a.length)continue;const r=(+a[j][4]/+a[i][4]-1),w=(p.notional/gross)*(p.direction==="SHORT"?-1:1);pr+=w*r}out.push(pr)}return out
}
function renderCorrMatrix(symbols,returns){
 let html='<table class="corrTable"><tr><th></th>'+symbols.map(x=>`<th>${coin(x)}</th>`).join("")+'</tr>';for(let i=0;i<symbols.length;i++){html+=`<tr><th>${coin(symbols[i])}</th>`;for(let j=0;j<symbols.length;j++){const c=i===j?1:corr(returns[i],returns[j]);html+=`<td>${Number.isFinite(c)?c.toFixed(2):"—"}</td>`}html+='</tr>'}html+='</table>';return html
}

const PORT_BUDGET_KEY="portfolioBudgetV42";
const PORT_V3_SETTINGS_KEY="portfolioV3SettingsV49";
function portfolioV3Settings(){
  try{return {...{crypto:-10,stocks:-5,other:-3,gapMult:1.5,costMult:3},...JSON.parse(localStorage.getItem(PORT_V3_SETTINGS_KEY)||"{}")}}catch{return {crypto:-10,stocks:-5,other:-3,gapMult:1.5,costMult:3}}
}
function renderPortfolioV3Inputs(){
  const x=portfolioV3Settings();if($("stressCrypto"))$("stressCrypto").value=x.crypto;if($("stressStocks"))$("stressStocks").value=x.stocks;if($("stressOther"))$("stressOther").value=x.other;if($("stressGapMult"))$("stressGapMult").value=x.gapMult;if($("stressCostMult"))$("stressCostMult").value=x.costMult
}

function portfolioBudgetSettings(){
  try{return {...{totalRiskPct:4,marketRiskPct:3,regimeRiskPct:2.5,clusterRiskPct:2,symbolExposurePct:30,corrThreshold:.65},...JSON.parse(localStorage.getItem(PORT_BUDGET_KEY)||"{}")}}
  catch{return {totalRiskPct:4,marketRiskPct:3,regimeRiskPct:2.5,clusterRiskPct:2,symbolExposurePct:30,corrThreshold:.65}}
}
function savePortfolioBudgets(){
  const x={
    totalRiskPct:Math.max(.5,+$("budgetTotal").value||4),
    marketRiskPct:Math.max(.5,+$("budgetMarket").value||3),
    regimeRiskPct:Math.max(.5,+$("budgetRegime").value||2.5),
    clusterRiskPct:Math.max(.5,+$("budgetCluster").value||2),
    symbolExposurePct:Math.max(5,+$("budgetSymbolExposure").value||30),
    corrThreshold:Math.max(.30,Math.min(.95,+$("piCorrThreshold").value||.65))
  };
  localStorage.setItem(PORT_BUDGET_KEY,JSON.stringify(x));renderPortfolioBudgetInputs();renderPortfolioBudgets(window.__portfolioRisk?.clusters||[]);toast("Paper portfolio risk budgets saved","good")
}
function renderPortfolioBudgetInputs(){
  const b=portfolioBudgetSettings();
  if($("budgetTotal"))$("budgetTotal").value=String(b.totalRiskPct);
  if($("budgetMarket"))$("budgetMarket").value=String(b.marketRiskPct);
  if($("budgetRegime"))$("budgetRegime").value=String(b.regimeRiskPct);
  if($("budgetCluster"))$("budgetCluster").value=String(b.clusterRiskPct);
  if($("budgetSymbolExposure"))$("budgetSymbolExposure").value=String(b.symbolExposurePct);
  if($("piCorrThreshold"))$("piCorrThreshold").value=String(b.corrThreshold)
}
function tradeMarket(t){return t.market||((t.source||"BINANCE")==="TWELVEDATA"?"STOCKS":"CRYPTO")}
function tradeRegime(t){return t.regime||"UNKNOWN"}
function tradeOpenRiskUsd(t){
  paperMigrateTrade(t);const target=Math.max(1e-12,+t.qtyTarget||+t.qtyFilled||+t.qty||1),open=Math.max(0,+t.qtyOpen||0);return Math.max(0,+t.riskUsd||0)*Math.min(1,open/target)
}
function tradeReservedRiskUsd(t){
  paperMigrateTrade(t);if(!paperEntryPending(t))return 0;const target=Math.max(1e-12,+t.qtyTarget||1),rem=Math.max(0,target-(+t.qtyFilled||0));return Math.max(0,+t.riskUsd||0)*Math.min(1,rem/target)
}
function tradeCommittedExposure(t){
  paperMigrateTrade(t);const open=(+t.last||+t.entry||+t.plannedEntry||0)*Math.max(0,+t.qtyOpen||0),rem=paperEntryPending(t)?Math.max(0,(+t.qtyTarget||0)-(+t.qtyFilled||0))*(+t.plannedEntry||+t.entry||0):0;return open+rem
}
function portfolioRiskLedger(){
  const trades=paperTrades().map(paperMigrateTrade).filter(t=>paperOrderActive(t)),market={},regime={},symbol={};let openRisk=0,reservedRisk=0,committedExposure=0;
  for(const t of trades){
    const o=tradeOpenRiskUsd(t),r=tradeReservedRiskUsd(t),risk=o+r,exp=tradeCommittedExposure(t),m=tradeMarket(t),g=tradeRegime(t),sym=t.symbol;
    openRisk+=o;reservedRisk+=r;committedExposure+=exp;market[m]=(market[m]||0)+risk;regime[g]=(regime[g]||0)+risk;symbol[sym]=(symbol[sym]||0)+exp
  }
  return {trades,openRisk,reservedRisk,totalRisk:openRisk+reservedRisk,committedExposure,market,regime,symbol}
}
function budgetRatioClass(r){return r>1?"riskBlock":r>=.8?"riskWatch":"riskPass"}
function setBudgetBar(id,ratio){
  const el=$(id);if(!el)return;const p=Math.max(0,Math.min(1.25,ratio))*100;el.style.width=Math.min(100,p)+"%";el.className="budgetFill "+(ratio>1?"budgetBad":ratio>=.8?"budgetWarn":"")
}
function portfolioBudgetSummary(clusters=[]){
  const b=portfolioBudgetSettings(),acc=paperAccountStats(),ledger=portfolioRiskLedger(),eq=Math.max(1,acc.equity),market=assetClass(),regime=window.__radarState?.q?.regime||"UNKNOWN";
  const clusterRisks=(clusters||[]).map(c=>c.riskUsd||0),largestClusterRisk=clusterRisks.length?Math.max(...clusterRisks):0,largestSymbolExposure=Object.values(ledger.symbol).length?Math.max(...Object.values(ledger.symbol)):0;
  const ratios={
    total:ledger.totalRisk/(eq*b.totalRiskPct/100),
    market:(ledger.market[market]||0)/(eq*b.marketRiskPct/100),
    regime:(ledger.regime[regime]||0)/(eq*b.regimeRiskPct/100),
    cluster:largestClusterRisk/(eq*b.clusterRiskPct/100),
    symbol:largestSymbolExposure/(eq*b.symbolExposurePct/100)
  };
  const max=Math.max(...Object.values(ratios)),state=max>1?"BLOCK":max>=.8?"WATCH":"PASS";
  return {b,acc,ledger,eq,market,regime,largestClusterRisk,largestSymbolExposure,ratios,state}
}
function renderPortfolioBudgets(clusters=[]){
  renderPortfolioBudgetInputs();const x=portfolioBudgetSummary(clusters),fmt=(v,p)=>`${money(v)} / ${money(x.eq*p/100)}`;
  $("budgetTotalUse").textContent=fmt(x.ledger.totalRisk,x.b.totalRiskPct);$("budgetMarketUse").textContent=fmt(x.ledger.market[x.market]||0,x.b.marketRiskPct);$("budgetRegimeUse").textContent=fmt(x.ledger.regime[x.regime]||0,x.b.regimeRiskPct);$("budgetClusterUse").textContent=fmt(x.largestClusterRisk,x.b.clusterRiskPct);$("budgetSymbolUse").textContent=`${(x.largestSymbolExposure/x.eq*100).toFixed(1)}% / ${x.b.symbolExposurePct.toFixed(1)}%`;$("budgetReserved").textContent=money(x.ledger.reservedRisk);
  $("budgetState").textContent=x.state;$("budgetState").className=budgetRatioClass(Math.max(...Object.values(x.ratios)));
  setBudgetBar("budgetTotalBar",x.ratios.total);setBudgetBar("budgetMarketBar",x.ratios.market);setBudgetBar("budgetRegimeBar",x.ratios.regime);setBudgetBar("budgetClusterBar",x.ratios.cluster);setBudgetBar("budgetSymbolBar",x.ratios.symbol);return x
}
function paperBudgetGate(candidateRisk,market,regime,symbol,candidateNotional,clusterSymbols=[]){
  const b=portfolioBudgetSettings(),acc=paperAccountStats(),ledger=portfolioRiskLedger(),eq=Math.max(1,acc.equity),members=new Set(clusterSymbols?.length?clusterSymbols:[symbol]);
  let clusterRisk=0;for(const t of ledger.trades)if(members.has(t.symbol))clusterRisk+=tradeOpenRiskUsd(t)+tradeReservedRiskUsd(t);
  const vals=[
    {key:"TOTAL",ratio:(ledger.totalRisk+candidateRisk)/(eq*b.totalRiskPct/100)},
    {key:"MARKET",ratio:((ledger.market[market]||0)+candidateRisk)/(eq*b.marketRiskPct/100)},
    {key:"REGIME",ratio:((ledger.regime[regime]||0)+candidateRisk)/(eq*b.regimeRiskPct/100)},
    {key:"CLUSTER",ratio:(clusterRisk+candidateRisk)/(eq*b.clusterRiskPct/100)},
    {key:"SYMBOL",ratio:((ledger.symbol[symbol]||0)+candidateNotional)/(eq*b.symbolExposurePct/100)}
  ];
  const worst=[...vals].sort((a,b)=>b.ratio-a.ratio)[0],state=worst.ratio>1?"BLOCK":worst.ratio>=.8?"WATCH":"PASS";return {state,worst,vals,clusterSymbols:[...members]}
}
function buildPortfolioPositions(open){
  const g={};
  for(const t of open){
    const key=`${tradeMarket(t)}|${t.symbol}`,notional=(+t.last||+t.entry||0)*(+t.qtyOpen||0),signed=notional*(t.direction==="SHORT"?-1:1),risk=tradeOpenRiskUsd(t);
    if(!g[key])g[key]={key,symbol:t.symbol,source:t.source||"BINANCE",market:tradeMarket(t),signedNotional:0,grossNotional:0,riskUsd:0,regimes:new Set(),trades:0};
    g[key].signedNotional+=signed;g[key].grossNotional+=Math.abs(notional);g[key].riskUsd+=risk;g[key].regimes.add(tradeRegime(t));g[key].trades++
  }
  return Object.values(g).map(x=>({...x,regimes:[...x.regimes]})).filter(x=>x.grossNotional>0)
}
function dailyReturnMap(rows){
  const sorted=[...(rows||[])].sort((a,b)=>+a[0]-+b[0]),m=new Map();
  for(let i=1;i<sorted.length;i++){const p=+sorted[i-1][4],c=+sorted[i][4];if(!p||!Number.isFinite(c))continue;const key=new Date(+sorted[i][0]).toISOString().slice(0,10);m.set(key,c/p-1)}
  return m
}
function alignReturnMatrix(seriesMap,positions){
  const maps=positions.map(p=>dailyReturnMap(seriesMap[p.symbol]||[]));if(!maps.length)return {dates:[],matrix:[]};
  let dates=[...maps[0].keys()];for(let i=1;i<maps.length;i++)dates=dates.filter(d=>maps[i].has(d));dates.sort();const matrix=dates.map(d=>maps.map(m=>m.get(d))).filter(r=>r.every(Number.isFinite));return {dates,matrix}
}
function corrMatrixFromAligned(matrix,n){
  if(!matrix.length)return Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>i===j?1:NaN));
  const cols=Array.from({length:n},(_,j)=>matrix.map(r=>r[j])),out=Array.from({length:n},()=>Array(n).fill(NaN));
  for(let i=0;i<n;i++)for(let j=0;j<n;j++)out[i][j]=i===j?1:corr(cols[i],cols[j]);return out
}
function covarianceMatrix(matrix,n){
  if(matrix.length<2)return Array.from({length:n},()=>Array(n).fill(0));const means=Array(n).fill(0);
  for(const r of matrix)for(let j=0;j<n;j++)means[j]+=r[j]/matrix.length;
  const c=Array.from({length:n},()=>Array(n).fill(0));for(const r of matrix)for(let i=0;i<n;i++)for(let j=0;j<n;j++)c[i][j]+=(r[i]-means[i])*(r[j]-means[j])/(matrix.length-1);return c
}
function portfolioRiskFromMatrix(matrix,positions){
  const n=positions.length;if(!n||!matrix.length)return {historicalVar:NaN,historicalCvar:NaN,paramVar:NaN,components:[],dailyPnl:[]};
  const w=positions.map(x=>+x.signedNotional||0),gross=positions.reduce((a,x)=>a+(+x.grossNotional||Math.abs(+x.signedNotional||0)),0),dailyPnl=matrix.map(r=>r.reduce((a,v,i)=>a+v*w[i],0)),q5=percentile(dailyPnl,.05),tail=dailyPnl.filter(x=>x<=q5),historicalVar=Math.max(0,-q5),historicalCvar=Math.max(0,-(tail.length?tail.reduce((a,b)=>a+b,0)/tail.length:q5));
  const cov=covarianceMatrix(matrix,n),cw=Array(n).fill(0);for(let i=0;i<n;i++)for(let j=0;j<n;j++)cw[i]+=cov[i][j]*w[j];
  let variance=0;for(let i=0;i<n;i++)variance+=w[i]*cw[i];const sigma=Math.sqrt(Math.max(0,variance)),z=1.6448536269514722,paramVar=z*sigma;
  const components=positions.map((p,i)=>{const marginal=sigma>1e-12?z*cw[i]/sigma:0,component=w[i]*marginal,standalone=z*Math.abs(w[i])*Math.sqrt(Math.max(0,cov[i][i]||0));return {...p,marginalPerDollar:marginal,marginalPer1k:marginal*1000,componentVar:component,standaloneVar:standalone}});
  return {historicalVar,historicalCvar,paramVar,components,dailyPnl,cov,gross}
}
function corrClusters(positions,corrM,threshold=.65){
  const n=positions.length,parent=Array.from({length:n},(_,i)=>i),find=x=>{while(parent[x]!==x){parent[x]=parent[parent[x]];x=parent[x]}return x},join=(a,b)=>{a=find(a);b=find(b);if(a!==b)parent[b]=a};
  const hedgePairs=[];for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){const c=corrM[i]?.[j];if(Number.isFinite(c)&&c>=threshold)join(i,j);if(Number.isFinite(c)&&c<=-threshold)hedgePairs.push({a:positions[i].symbol,b:positions[j].symbol,corr:c})}
  const groups={};for(let i=0;i<n;i++){const r=find(i);(groups[r]??=[]).push(i)}
  const clusters=Object.values(groups).map((ix,k)=>{const members=ix.map(i=>positions[i]),gross=members.reduce((a,x)=>a+x.grossNotional,0),riskUsd=members.reduce((a,x)=>a+x.riskUsd,0),signed=members.reduce((a,x)=>a+x.signedNotional,0);return {id:k+1,indices:ix,members,gross,riskUsd,signed}});
  return {clusters,hedgePairs}
}
function renderComponentVar(metrics){
  const comps=metrics.components||[],sum=comps.reduce((a,x)=>a+x.componentVar,0),standalone=comps.reduce((a,x)=>a+x.standaloneVar,0),net=comps.reduce((a,x)=>a+x.signedNotional,0),gross=comps.reduce((a,x)=>a+x.grossNotional,0),largest=[...comps].sort((a,b)=>Math.abs(b.componentVar)-Math.abs(a.componentVar))[0],div=Math.max(0,standalone-metrics.paramVar);
  $("piParamVar").textContent=Number.isFinite(metrics.paramVar)?money(metrics.paramVar):"—";$("piComponentSum").textContent=Number.isFinite(sum)?money(sum):"—";$("piNetExposure").textContent=money(net);$("piGrossNet").textContent=Math.abs(net)>1?`${(gross/Math.abs(net)).toFixed(2)}×`:"HEDGED";$("piLargestRisk").textContent=largest?`${coin(largest.symbol)} · ${money(largest.componentVar)}`:"—";$("piDiversification").textContent=money(div);
  $("piComponentTable").innerHTML=comps.length?`<div class="piRow"><div class="piCell">Symbol</div><div class="piCell">Signed exp.</div><div class="piCell">Standalone VaR</div><div class="piCell">Marginal / $1k</div><div class="piCell">Component VaR</div><div class="piCell">Share</div><div class="piCell">Role</div></div>`+comps.map(x=>{const share=metrics.paramVar?x.componentVar/metrics.paramVar*100:0,role=x.componentVar<0?"DIVERSIFIER":share>=35?"DOMINANT":"CONTRIBUTOR";return `<div class="piRow"><div class="piCell">${coin(x.symbol)}</div><div class="piCell">${money(x.signedNotional)}</div><div class="piCell">${money(x.standaloneVar)}</div><div class="piCell">${money(x.marginalPer1k)}</div><div class="piCell ${x.componentVar<0?"good":""}">${money(x.componentVar)}</div><div class="piCell">${share.toFixed(1)}%</div><div class="piCell">${role}</div></div>`}).join(""):'<div class="emptyState">No open risk positions.</div>';
  return {sum,standalone,net,gross,largest,div}
}
function renderCorrelationClusters(clusters,hedgePairs,totalGross){
  $("piClusterN").textContent=clusters.length;const largest=[...clusters].sort((a,b)=>b.gross-a.gross)[0];$("piLargestCluster").textContent=largest?`${largest.members.length} assets · ${money(largest.gross)}`:"—";$("piClusterConc").textContent=largest&&totalGross?`${(largest.gross/totalGross*100).toFixed(1)}%`:"—";$("piHedgePairs").textContent=hedgePairs.length;
  $("piClusterTable").innerHTML=clusters.length?`<div class="clusterRow"><div class="clusterCell">Cluster</div><div class="clusterCell">Members</div><div class="clusterCell">Gross</div><div class="clusterCell">Net</div><div class="clusterCell">Open risk</div><div class="clusterCell">Concentration</div></div>`+clusters.map(c=>`<div class="clusterRow"><div class="clusterCell">#${c.id}</div><div class="clusterCell">${c.members.map(x=>coin(x.symbol)).join(" · ")}</div><div class="clusterCell">${money(c.gross)}</div><div class="clusterCell">${money(c.signed)}</div><div class="clusterCell">${money(c.riskUsd)}</div><div class="clusterCell">${totalGross?(c.gross/totalGross*100).toFixed(1):"0"}%</div></div>`).join(""):'<div class="emptyState">No clusters.</div>'
}
function portfolioCandidatePlan(){
  const st=window.__radarState,ss=window.__signalState;if(!st||!ss||ss.tm.direction==="WAIT")return null;const acc=paperAccountStats(),cfg=acc.cfg,adaptive=adaptivePaperRiskMultiplier(),entry=(ss.tm.entryLow+ss.tm.entryHigh)/2,dist=Math.abs(entry-ss.tm.stop);if(!dist)return null;
  const riskUsd=Math.max(0,acc.equity*cfg.riskPct/100*adaptive.mult),qty=riskUsd/dist,notional=qty*entry;return {symbol:st.symbol,source:st.source||analysisSource(),market:assetClass(),regime:st.q.regime||"UNKNOWN",direction:ss.tm.direction,entry,stop:ss.tm.stop,riskUsd,qty,notional,signedNotional:notional*(ss.tm.direction==="SHORT"?-1:1),grossNotional:notional}
}
async function assessCurrentSetupPortfolioRisk(showToast=false){
  const cand=portfolioCandidatePlan();if(!cand){$("preTradeNote").textContent="No active LONG/SHORT setup to assess.";if(showToast)toast("Run an active LONG/SHORT setup first","warn");return null}
  $("preTradeNote").textContent="Calculating candidate portfolio impact…";
  try{
    const base=window.__portfolioRisk,open=paperTrades().map(paperMigrateTrade).filter(paperPositionActive),basePos=buildPortfolioPositions(open),seriesMap={...(base?.seriesMap||{})};
    if(!seriesMap[cand.symbol])seriesMap[cand.symbol]=await analysisKlines(cand.symbol,"1d",180,cand.source);
    for(const p of basePos)if(!seriesMap[p.symbol])seriesMap[p.symbol]=await analysisKlines(p.symbol,"1d",180,p.source);
    const combined=[...basePos,cand],aligned=alignReturnMatrix(seriesMap,combined);if(aligned.matrix.length<20)throw Error("Need at least 20 common daily returns.");
    const n=basePos.length,baseMatrix=aligned.matrix.map(r=>r.slice(0,n)),baseMetrics=n?portfolioRiskFromMatrix(baseMatrix,basePos):{historicalVar:0,historicalCvar:0},combinedMetrics=portfolioRiskFromMatrix(aligned.matrix,combined),corrM=corrMatrixFromAligned(aligned.matrix,combined.length),candIdx=combined.length-1,corrs=n?corrM[candIdx].slice(0,n).filter(Number.isFinite):[],maxCorr=corrs.length?Math.max(...corrs.map(Math.abs)):0,th=portfolioBudgetSettings().corrThreshold,clusterSymbols=[cand.symbol,...basePos.filter((_,i)=>Number.isFinite(corrM[candIdx][i])&&corrM[candIdx][i]>=th).map(x=>x.symbol)],gate=paperBudgetGate(cand.riskUsd,cand.market,cand.regime,cand.symbol,cand.notional,clusterSymbols);
    const symbolGross={};for(const p of combined)symbolGross[p.symbol]=(symbolGross[p.symbol]||0)+p.grossNotional;const totalGross=Object.values(symbolGross).reduce((a,b)=>a+b,0),largest=totalGross?Math.max(...Object.values(symbolGross))/totalGross:0,incVar=combinedMetrics.historicalVar-(baseMetrics.historicalVar||0),incCvar=combinedMetrics.historicalCvar-(baseMetrics.historicalCvar||0);
    $("preNotional").textContent=money(cand.notional);$("preIncVar").textContent=(incVar>=0?"+":"")+money(incVar);$("preIncCvar").textContent=(incCvar>=0?"+":"")+money(incCvar);$("preCorr").textContent=maxCorr.toFixed(2);$("preConcentration").textContent=(largest*100).toFixed(1)+"%";$("preBudgetGate").textContent=gate.state;$("preBudgetGate").className=gate.state==="BLOCK"?"riskBlock":gate.state==="WATCH"?"riskWatch":"riskPass";
    $("preTradeNote").textContent=`Same-sample daily history N=${aligned.matrix.length}. Budget bottleneck: ${gate.worst.key} ${(gate.worst.ratio*100).toFixed(0)}% used after candidate. Correlation cluster: ${[...new Set(clusterSymbols.map(coin))].join(", ")}.`;
    const result={candidate:cand,incVar,incCvar,maxCorr,postConcentration:largest,gate,clusterSymbols,combinedMetrics,updated:Date.now()};window.__portfolioRisk={...(base||{}),preTrade:result};if(showToast)toast(`Pre-trade risk: ${gate.state} · ΔVaR ${money(incVar)}`,gate.state==="BLOCK"?"bad":gate.state==="WATCH"?"warn":"good");return result
  }catch(e){$("preTradeNote").textContent=`Pre-trade assessment unavailable: ${escapeHtml(e.message)}`;if(showToast)toast("Pre-trade risk unavailable: "+e.message,"warn");return null}
}
function strategyProfileRow(rows,key){
  const mean=k=>{const a=rows.map(x=>+x[k]).filter(Number.isFinite);return a.length?a.reduce((u,v)=>u+v,0)/a.length:NaN},norm=(v,a,b,d=.5)=>Number.isFinite(v)?clamp((v-a)/(b-a),0,1):d,first=rows[0],stats=statsRows(rows);
  const vec=[
    norm(mean("trendScore"),0,100),norm(mean("momScore"),0,100),norm(mean("volScore"),0,100),norm(mean("structureScore"),0,100),
    norm(mean("adx"),0,50),norm(mean("atrPct"),0,8),norm(mean("mfi"),0,100),norm(mean("cmf"),-1,1),norm(mean("histUp"),0,100),
    norm(mean("mtf"),0,100),norm(mean("microScore"),-100,100),norm(mean("sweepScore"),0,100),1-norm(mean("frictionBps"),0,80)
  ];
  return {key,source:first.source||"BINANCE",tf:first.tf||"—",mode:first.mode||"—",direction:first.direction||"—",regime:first.regime||"UNKNOWN",rows,n:rows.length,avg:stats.avg,pf:stats.pf,win:stats.win,vec}
}
function strategySegments(){
  const resolved=journal().map(x=>({...x,r:metricR(x)})).filter(x=>Number.isFinite(x.r)&&(x.direction==="LONG"||x.direction==="SHORT")),g={};
  for(const x of resolved){const k=`${x.source||"BINANCE"}|${x.tf||"?"}|${x.mode||"?"}|${x.direction}|${x.regime||"UNKNOWN"}`;(g[k]??=[]).push(x)}
  return Object.entries(g).filter(([,r])=>r.length>=8).map(([k,r])=>strategyProfileRow(chronologicalRows(r),k))
}
function strategySimilarity(a,b){
  if(a.source!==b.source||a.direction!==b.direction)return 0;const d=Math.sqrt(a.vec.reduce((z,v,i)=>z+(v-b.vec[i])**2,0)/a.vec.length);return clamp(1-d/.45,0,1)
}
function clusterStrategyFamilies(segments,threshold=.82){
  const n=segments.length,parent=Array.from({length:n},(_,i)=>i),find=x=>{while(parent[x]!==x){parent[x]=parent[parent[x]];x=parent[x]}return x},join=(a,b)=>{a=find(a);b=find(b);if(a!==b)parent[b]=a};
  for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)if(strategySimilarity(segments[i],segments[j])>=threshold)join(i,j);
  const g={};for(let i=0;i<n;i++){const r=find(i);(g[r]??=[]).push(i)}
  return Object.values(g).map((ix,k)=>{const members=ix.map(i=>segments[i]),rows=members.flatMap(x=>x.rows),st=statsRows(rows),pairs=[];for(let i=0;i<members.length;i++)for(let j=i+1;j<members.length;j++)pairs.push(strategySimilarity(members[i],members[j]));return {id:k+1,members,n:rows.length,avg:st.avg,pf:st.pf,win:st.win,similarity:pairs.length?pairs.reduce((a,b)=>a+b,0)/pairs.length:1}})
}
function renderStrategyFamilies(){
  const seg=strategySegments(),threshold=Math.max(.60,Math.min(.98,+$("familyThreshold").value||.82)),fam=clusterStrategyFamilies(seg,threshold),largest=fam.length?Math.max(...fam.map(x=>x.members.length)):0,redundant=Math.max(0,seg.length-fam.length),div=seg.length?fam.length/seg.length*100:0;
  $("familySegments").textContent=seg.length;$("familyCount").textContent=fam.length;$("familyLargest").textContent=largest;$("familyRedundant").textContent=redundant;$("familyDiversification").textContent=seg.length?div.toFixed(0)+"/100":"—";
  $("familyTable").innerHTML=fam.length?`<div class="familyRow"><div class="familyCell">Family</div><div class="familyCell">Segments</div><div class="familyCell">Resolved N</div><div class="familyCell">Expectancy</div><div class="familyCell">PF</div><div class="familyCell">Similarity</div><div class="familyCell">Interpretation</div></div>`+fam.sort((a,b)=>b.n-a.n).map(x=>{const labels=x.members.map(m=>`${m.tf}/${m.mode}/${m.direction}/${m.regime}`),interp=x.members.length>=3&&x.similarity>=.88?"HIGH REDUNDANCY":x.members.length>=2?"RELATED":"DISTINCT";return `<div class="familyRow"><div class="familyCell">#${x.id}</div><div class="familyCell">${labels.map(v=>`<span class="familyChip">${v}</span>`).join("")}</div><div class="familyCell">${x.n}</div><div class="familyCell ${x.avg>=0?"good":"bad"}">${x.avg.toFixed(2)} R</div><div class="familyCell">${x.pf.toFixed(2)}</div><div class="familyCell">${(x.similarity*100).toFixed(0)}%</div><div class="familyCell">${interp}</div></div>`}).join(""):'<div class="emptyState">Need resolved strategy segments with N ≥ 8.</div>';
  window.__strategyFamilies={segments:seg,families:fam,threshold};return window.__strategyFamilies
}

function avgAbsOffDiag(corrM){
  const a=[];for(let i=0;i<corrM.length;i++)for(let j=i+1;j<corrM.length;j++)if(Number.isFinite(corrM[i]?.[j]))a.push(Math.abs(corrM[i][j]));return a.length?a.reduce((x,y)=>x+y,0)/a.length:0
}
function stdDev(a){
  const x=(a||[]).filter(Number.isFinite);if(x.length<2)return NaN;const m=x.reduce((u,v)=>u+v,0)/x.length;return Math.sqrt(x.reduce((u,v)=>u+(v-m)**2,0)/(x.length-1))
}
function covariance(a,b){
  const n=Math.min(a.length,b.length);if(n<2)return NaN;const x=a.slice(-n),y=b.slice(-n),mx=x.reduce((u,v)=>u+v,0)/n,my=y.reduce((u,v)=>u+v,0)/n;return x.reduce((u,v,i)=>u+(v-mx)*(y[i]-my),0)/(n-1)
}
function expectedShortfallPnl(dailyPnl,alpha=.975){
  const a=(dailyPnl||[]).filter(Number.isFinite).sort((x,y)=>x-y);if(!a.length)return NaN;const tailN=Math.max(1,Math.ceil(a.length*(1-alpha))),tail=a.slice(0,tailN);return Math.max(0,-tail.reduce((u,v)=>u+v,0)/tail.length)
}
function rollingPortfolioWindows(matrix,positions){
  const defs=[20,60,120],out=[];for(const n of defs){if(matrix.length<Math.min(n,20))continue;const m=matrix.slice(-Math.min(n,matrix.length)),risk=portfolioRiskFromMatrix(m,positions),corrM=corrMatrixFromAligned(m,positions.length);out.push({window:n,n:m.length,risk,corrM,avgCorr:avgAbsOffDiag(corrM)})}return out
}
function clusterMembershipPairs(positions,corrM,threshold){
  const set=new Set();for(let i=0;i<positions.length;i++)for(let j=i+1;j<positions.length;j++){const c=corrM[i]?.[j];if(Number.isFinite(c)&&c>=threshold)set.add([positions[i].symbol,positions[j].symbol].sort().join("|"))}return set
}
function pairSetChanges(a,b){
  const all=new Set([...a,...b]);let n=0;for(const x of all)if(a.has(x)!==b.has(x))n++;return n
}
function portfolioFactorDiagnostics(matrix,positions){
  if(!matrix.length||!positions.length)return {beta:NaN,highVol:NaN,cryptoWeight:NaN,stockWeight:NaN,netGross:NaN};
  const gross=positions.reduce((a,x)=>a+x.grossNotional,0)||1,w=positions.map(x=>x.signedNotional/gross),port=matrix.map(r=>r.reduce((a,v,i)=>a+v*w[i],0)),factor=matrix.map(r=>r.reduce((a,b)=>a+b,0)/r.length),vf=covariance(factor,factor),beta=vf>1e-12?covariance(port,factor)/vf:NaN,absF=factor.map(Math.abs),cut=percentile(absF,.75),hi=port.filter((_,i)=>Math.abs(factor[i])>=cut),highVol=hi.length?hi.reduce((a,b)=>a+b,0)/hi.length:NaN,cryptoGross=positions.filter(x=>x.market==="CRYPTO").reduce((a,x)=>a+x.grossNotional,0),stockGross=positions.filter(x=>x.market==="STOCKS").reduce((a,x)=>a+x.grossNotional,0),net=positions.reduce((a,x)=>a+x.signedNotional,0);
  return {beta,highVol,cryptoWeight:cryptoGross/gross,stockWeight:stockGross/gross,netGross:net/gross,port,factor}
}
function volatilityAdjustedSizing(matrix,positions,lookback=60){
  const m=matrix.slice(-Math.min(lookback,matrix.length)),gross=positions.reduce((a,x)=>a+x.grossNotional,0)||0;if(!gross||!m.length)return [];
  const vols=positions.map((_,j)=>stdDev(m.map(r=>r[j]))),inv=vols.map(v=>Number.isFinite(v)&&v>1e-9?1/v:0),sum=inv.reduce((a,b)=>a+b,0)||1;
  return positions.map((p,i)=>{const targetShare=inv[i]/sum,currentShare=p.grossNotional/gross,targetNotional=gross*targetShare;return {...p,vol:vols[i],currentShare,targetShare,targetNotional,deltaNotional:targetNotional-p.grossNotional}})
}
function rollingContributionHistory(matrix,positions){
  const defs=[20,40,60,120],rows=[];for(const n of defs){if(matrix.length<Math.min(20,n))continue;const m=matrix.slice(-Math.min(n,matrix.length)),risk=portfolioRiskFromMatrix(m,positions),den=risk.components.reduce((a,x)=>a+Math.abs(x.componentVar),0)||1;rows.push({window:n,n:m.length,paramVar:risk.paramVar,shares:risk.components.map(x=>({symbol:x.symbol,share:Math.abs(x.componentVar)/den,componentVar:x.componentVar}))})}return rows
}
function corrOneVar(matrix,positions){
  if(matrix.length<2||!positions.length)return NaN;const z=1.6448536269514722,vols=positions.map((_,j)=>stdDev(matrix.map(r=>r[j]))),w=positions.map(x=>+x.signedNotional||0);let exposure=0;for(let i=0;i<w.length;i++)exposure+=w[i]*(vols[i]||0);return z*Math.abs(exposure)
}
function maxCrowdingVar(matrix,positions){
  if(matrix.length<2||!positions.length)return NaN;const z=1.6448536269514722,vols=positions.map((_,j)=>stdDev(matrix.map(r=>r[j]))),w=positions.map(x=>Math.abs(+x.signedNotional||0));return z*w.reduce((a,x,i)=>a+x*(vols[i]||0),0)
}
function portfolioV3Metrics(base=window.__portfolioRisk){
  if(!base?.aligned?.matrix?.length||!base?.pos?.length)return null;
  const matrix=base.aligned.matrix,pos=base.pos,rolling=rollingPortfolioWindows(matrix,pos),short=rolling.find(x=>x.window===20)||rolling[0],long=rolling.find(x=>x.window===60)||rolling.at(-1),th=portfolioBudgetSettings().corrThreshold,recentPairs=short?clusterMembershipPairs(pos,short.corrM,th):new Set(),longPairs=long?clusterMembershipPairs(pos,long.corrM,th):new Set(),clusterChanges=pairSetChanges(recentPairs,longPairs),divDecay=(short?.avgCorr??0)-(long?.avgCorr??0),factor=portfolioFactorDiagnostics(matrix,pos),sizing=volatilityAdjustedSizing(matrix,pos),contrib=rollingContributionHistory(matrix,pos),es975=expectedShortfallPnl(portfolioRiskFromMatrix(matrix,pos).dailyPnl,.975),acc=paperAccountStats(),riskPct=acc.equity?es975/acc.equity:0,state=riskPct>=.075||short?.avgCorr>=.85?"HIGH":riskPct>=.04||divDecay>=.15||short?.avgCorr>=.70?"WATCH":"NORMAL";
  return {rolling,short,long,clusterChanges,divDecay,factor,sizing,contrib,es975,riskPct,state,corrOneVar:corrOneVar(matrix,pos),crowdingVar:maxCrowdingVar(matrix,pos),ts:Date.now()}
}
function renderPortfolioV3(showToast=false){
  const v=portfolioV3Metrics();if(!v){for(const id of ["pv3Es975","pv3Risk20","pv3Risk60","pv3DynCorr","pv3DivDecay","pv3ClusterChanges","pv3Beta","pv3HighVol","pv3CryptoWeight","pv3StockWeight","pv3NetGross","pv3State"])if($(id))$(id).textContent="—";if(showToast)toast("Load open Paper portfolio risk first.","warn");return null}
  window.__portfolioV3=v;$("pv3Es975").textContent=money(v.es975);$("pv3Risk20").textContent=v.short?`${money(v.short.risk.historicalVar)} / ${money(v.short.risk.historicalCvar)}`:"—";$("pv3Risk60").textContent=v.long?`${money(v.long.risk.historicalVar)} / ${money(v.long.risk.historicalCvar)}`:"—";$("pv3DynCorr").textContent=v.short?v.short.avgCorr.toFixed(2):"—";$("pv3DivDecay").textContent=(v.divDecay>=0?"+":"")+v.divDecay.toFixed(2);$("pv3ClusterChanges").textContent=v.clusterChanges;$("pv3Beta").textContent=Number.isFinite(v.factor.beta)?v.factor.beta.toFixed(2):"—";$("pv3HighVol").textContent=Number.isFinite(v.factor.highVol)?(v.factor.highVol*100).toFixed(2)+"% avg/day":"—";$("pv3CryptoWeight").textContent=Number.isFinite(v.factor.cryptoWeight)?(v.factor.cryptoWeight*100).toFixed(1)+"%":"—";$("pv3StockWeight").textContent=Number.isFinite(v.factor.stockWeight)?(v.factor.stockWeight*100).toFixed(1)+"%":"—";$("pv3NetGross").textContent=Number.isFinite(v.factor.netGross)?v.factor.netGross.toFixed(2):"—";$("pv3State").textContent=v.state;$("pv3State").className=v.state==="HIGH"?"bad":v.state==="WATCH"?"neutral":"good";
  $("pv3RollingTable").innerHTML=`<div class="pv3Row"><div class="pv3Cell">Window</div><div class="pv3Cell">Hist VaR</div><div class="pv3Cell">CVaR</div><div class="pv3Cell">Param VaR</div><div class="pv3Cell">Avg |corr|</div><div class="pv3Cell">Obs.</div></div>`+v.rolling.map(x=>`<div class="pv3Row"><div class="pv3Cell">${x.window}D</div><div class="pv3Cell">${money(x.risk.historicalVar)}</div><div class="pv3Cell">${money(x.risk.historicalCvar)}</div><div class="pv3Cell">${money(x.risk.paramVar)}</div><div class="pv3Cell">${x.avgCorr.toFixed(2)}</div><div class="pv3Cell">${x.n}</div></div>`).join("");
  $("pv3SizingTable").innerHTML=v.sizing.length?`<div class="pv3Row"><div class="pv3Cell">Symbol</div><div class="pv3Cell">60D vol</div><div class="pv3Cell">Current share</div><div class="pv3Cell">Inv-vol target</div><div class="pv3Cell">Target notional</div><div class="pv3Cell">Δ notional</div></div>`+v.sizing.map(x=>`<div class="pv3Row"><div class="pv3Cell">${coin(x.symbol)}</div><div class="pv3Cell">${Number.isFinite(x.vol)?(x.vol*100).toFixed(2)+"%":"—"}</div><div class="pv3Cell">${(x.currentShare*100).toFixed(1)}%</div><div class="pv3Cell">${(x.targetShare*100).toFixed(1)}%</div><div class="pv3Cell">${money(x.targetNotional)}</div><div class="pv3Cell ${x.deltaNotional<0?"bad":"good"}">${x.deltaNotional>=0?"+":""}${money(x.deltaNotional)}</div></div>`).join(""):'<div class="emptyState">No sizing rows.</div>';
  const syms=window.__portfolioRisk.pos.map(x=>x.symbol);$("pv3ContributionTable").innerHTML=v.contrib.length?`<div class="pv3Row"><div class="pv3Cell">Window</div>${syms.slice(0,4).map(x=>`<div class="pv3Cell">${coin(x)}</div>`).join("")}<div class="pv3Cell">Param VaR</div></div>`+v.contrib.map(x=>`<div class="pv3Row"><div class="pv3Cell">${x.window}D</div>${syms.slice(0,4).map(sym=>{const q=x.shares.find(z=>z.symbol===sym);return `<div class="pv3Cell">${q?(q.share*100).toFixed(1)+"%":"—"}</div>`}).join("")}<div class="pv3Cell">${money(x.paramVar)}</div></div>`).join(""):'<div class="emptyState">Need more rolling observations.</div>';
  if(localDbSupported())localDbPutRecord("portfolio_risk",String(v.ts),{ts:v.ts,state:v.state,es975:v.es975,riskPct:v.riskPct,dynCorr:v.short?.avgCorr??null,divDecay:v.divDecay,clusterChanges:v.clusterChanges,beta:v.factor.beta,highVol:v.factor.highVol},v.ts).catch(()=>{});
  if(showToast)toast(`Portfolio v3: ${v.state} · ES97.5 ${money(v.es975)}`,v.state==="HIGH"?"bad":v.state==="WATCH"?"warn":"good");return v
}
function portfolioStressInputs(){
  const raw={crypto:Number.isFinite(+$("stressCrypto")?.value)?+$("stressCrypto").value:-10,stocks:Number.isFinite(+$("stressStocks")?.value)?+$("stressStocks").value:-5,other:Number.isFinite(+$("stressOther")?.value)?+$("stressOther").value:-3,gapMult:Math.max(1,+$("stressGapMult")?.value||1.5),costMult:Math.max(1,+$("stressCostMult")?.value||3)};
  localStorage.setItem(PORT_V3_SETTINGS_KEY,JSON.stringify(raw));return {crypto:raw.crypto/100,stocks:raw.stocks/100,other:raw.other/100,gapMult:raw.gapMult,costMult:raw.costMult}
}
function stressPnlByMarket(pos,cryptoShock,stockShock,otherShock){
  return pos.reduce((a,p)=>{const r=p.market==="CRYPTO"?cryptoShock:p.market==="STOCKS"?stockShock:otherShock;return a+p.signedNotional*r},0)
}
function stressGapLoss(base,gapMult=1.5){
  const m=base.aligned.matrix,pos=base.pos,vols=pos.map((_,j)=>stdDev(m.slice(-60).map(r=>r[j])));let pnl=0;
  for(let i=0;i<pos.length;i++){const pct=Math.min(.30,Math.max(.03,(vols[i]||.02)*3*gapMult)),shock=pos[i].signedNotional>=0?-pct:pct;pnl+=pos[i].signedNotional*shock}return pnl
}
function stressStopGapLoss(pos,gapMult=1.5){return -pos.reduce((a,p)=>a+(+p.riskUsd||0)*gapMult,0)}
function stressCostLoss(pos,costMult=3){
  const gross=pos.reduce((a,p)=>a+p.grossNotional,0),cfg=appSettings(),bps=(+cfg.feeBps||0)+(+cfg.slippageBps||0);return -gross*bps*costMult/10000
}
function buildStressSuite(){
  const base=window.__portfolioRisk,v3=window.__portfolioV3||portfolioV3Metrics(base);if(!base?.pos?.length||!base?.aligned?.matrix?.length||!v3)return null;const inp=portfolioStressInputs(),pos=base.pos,acc=paperAccountStats(),corrVar=v3.crowdingVar,vol2=(base.paramVar||portfolioRiskFromMatrix(base.aligned.matrix,pos).paramVar)*2,custom=stressPnlByMarket(pos,inp.crypto,inp.stocks,inp.other),scenarios=[
    {name:"Custom market shock",pnl:custom,kind:"MARKET",detail:`Crypto ${(inp.crypto*100).toFixed(0)}% · Stocks ${(inp.stocks*100).toFixed(0)}%`},
    {name:"Crypto crash",pnl:stressPnlByMarket(pos,-.15,-.05,-.07),kind:"MARKET",detail:"Crypto -15% · Stocks -5%"},
    {name:"Equity selloff",pnl:stressPnlByMarket(pos,-.06,-.08,-.05),kind:"MARKET",detail:"Crypto -6% · Stocks -8%"},
    {name:"Adverse gap",pnl:stressGapLoss(base,inp.gapMult),kind:"GAP",detail:`3σ adverse gap ×${inp.gapMult.toFixed(1)}`},
    {name:"Stop gap-through",pnl:stressStopGapLoss(pos,inp.gapMult),kind:"STOP",detail:`Initial risk ×${inp.gapMult.toFixed(1)}`},
    {name:"Liquidity/cost shock",pnl:stressCostLoss(pos,inp.costMult),kind:"COST",detail:`fee+slippage ×${inp.costMult.toFixed(1)}`},
    {name:"Correlation → 1 VaR",pnl:-corrVar,kind:"VAR",detail:"all absolute risk exposures crowded"},
    {name:"Volatility ×2 VaR",pnl:-vol2,kind:"VAR",detail:"parametric σ doubled"}
  ],worst=[...scenarios].sort((a,b)=>a.pnl-b.pnl)[0],eq=Math.max(1,acc.equity),worstPct=-worst.pnl/eq,state=-worst.pnl>=eq*.12?"SEVERE":-worst.pnl>=eq*.07?"HIGH":-worst.pnl>=eq*.04?"WATCH":"NORMAL";
  return {inputs:inp,scenarios,worst,worstPct,state,corrVar,vol2,custom,ts:Date.now()}
}
function runPortfolioStress(showToast=false){
  const x=buildStressSuite();if(!x){if(showToast)toast("Load Portfolio Intelligence first.","warn");return null}window.__portfolioStress=x;$("stressWorst").textContent=x.worst.name;$("stressWorstPnl").textContent=money(x.worst.pnl);$("stressWorstPct").textContent=(x.worstPct*100).toFixed(1)+"%";$("stressCorrOne").textContent=money(x.corrVar);$("stressVol2").textContent=money(x.vol2);$("stressCustom").textContent=money(x.custom);$("stressState").textContent=x.state;$("stressState").className=x.state==="SEVERE"||x.state==="HIGH"?"bad":x.state==="WATCH"?"neutral":"good";
  const eq=Math.max(1,paperAccountStats().equity);$("stressTable").innerHTML=`<div class="stressRow"><div class="stressCell">Scenario</div><div class="stressCell">PnL</div><div class="stressCell">Equity hit</div><div class="stressCell">Type</div><div class="stressCell">Assumption</div></div>`+x.scenarios.map(z=>`<div class="stressRow"><div class="stressCell">${z.name}</div><div class="stressCell ${z.pnl<0?"stressLoss":"stressGood"}">${z.pnl>=0?"+":""}${money(z.pnl)}</div><div class="stressCell">${z.pnl<0?(-z.pnl/eq*100).toFixed(1):"0.0"}%</div><div class="stressCell">${z.kind}</div><div class="stressCell">${z.detail}</div></div>`).join("");
  if(localDbSupported())localDbPutRecord("stress_tests",String(x.ts),x,x.ts).catch(()=>{});
  renderMasterVerdict();if(showToast)toast(`Stress: ${x.state} · worst ${money(x.worst.pnl)}`,x.state==="SEVERE"||x.state==="HIGH"?"bad":x.state==="WATCH"?"warn":"good");return x
}
async function loadPortfolioRisk(force=false){
 const open=paperTrades().map(paperMigrateTrade).filter(paperPositionActive),acc=paperAccountStats(),cb=paperCircuitBreaker(),provider=assetClass()==="STOCKS"?"TWELVEDATA":analysisSource();renderPortfolioBudgetInputs();
 $("portN").textContent=open.length;$("portExposure").textContent=money(acc.exposure);$("portWeekly").textContent=money(acc.weekly);$("portEqDd").textContent=acc.ddPct.toFixed(2)+"%";$("portBreaker").textContent=cb.state;$("portProvider").textContent=provider;
 if(!open.length){
   for(const id of ["portLargest","portCorr","portVar","portCvar","piParamVar","piComponentSum","piNetExposure","piGrossNet","piLargestRisk","piDiversification"])$(id).textContent="—";
   $("portStatus").textContent="NO OPEN POSITIONS";$("portfolioCorr").innerHTML='<div class="emptyState">Add filled Paper positions to calculate portfolio risk.</div>';$("piComponentTable").innerHTML='<div class="emptyState">No open positions.</div>';$("piClusterTable").innerHTML='<div class="emptyState">No open positions.</div>';window.__portfolioRisk=null;window.__portfolioV3=null;window.__portfolioStress=null;$("portRiskMult").textContent=adaptivePaperRiskMultiplier().mult.toFixed(2)+"×";renderPortfolioBudgets([]);renderPortfolioV3(false);renderStrategyFamilies();await assessCurrentSetupPortfolioRisk(false);return
 }
 try{
   const pos=buildPortfolioPositions(open),seriesMap={};await Promise.all(pos.map(async x=>{seriesMap[x.symbol]=await analysisKlines(x.symbol,"1d",180,x.source)}));
   const aligned=alignReturnMatrix(seriesMap,pos);if(aligned.matrix.length<20)throw Error("Need at least 20 common daily return observations.");
   const corrM=corrMatrixFromAligned(aligned.matrix,pos.length),pairs=[];for(let i=0;i<pos.length;i++)for(let j=i+1;j<pos.length;j++){const c=corrM[i][j];if(Number.isFinite(c))pairs.push(Math.abs(c))}
   const avgAbsCorr=pairs.length?pairs.reduce((a,b)=>a+b,0)/pairs.length:0,gross=pos.reduce((a,x)=>a+x.grossNotional,0)||1,largestShare=Math.max(...pos.map(x=>x.grossNotional/gross)),metrics=portfolioRiskFromMatrix(aligned.matrix,pos),th=portfolioBudgetSettings().corrThreshold,clustered=corrClusters(pos,corrM,th);
   renderComponentVar(metrics);renderCorrelationClusters(clustered.clusters,clustered.hedgePairs,gross);const budget=renderPortfolioBudgets(clustered.clusters);
   const componentAbs=metrics.components.reduce((a,x)=>a+Math.abs(x.componentVar),0)||1,largestComponentShare=Math.max(...metrics.components.map(x=>Math.abs(x.componentVar)/componentAbs)),largestClusterShare=clustered.clusters.length?Math.max(...clustered.clusters.map(x=>x.gross/gross)):0;
   window.__portfolioRisk={avgAbsCorr,largestShare,varUsd:metrics.historicalVar,cvarUsd:metrics.historicalCvar,paramVar:metrics.paramVar,largestComponentShare,largestClusterShare,updated:Date.now(),pos,seriesMap,aligned,corrMatrix:corrM,clusters:clustered.clusters,hedgePairs:clustered.hedgePairs,budgetState:budget.state};
   renderPortfolioV3(false);runPortfolioStress(false);
   const riskMult=adaptivePaperRiskMultiplier().mult,status=cb.state==="PAUSE"?"PAUSE":budget.state==="BLOCK"?"RISK BUDGET BLOCK":window.__portfolioStress?.state==="SEVERE"?"STRESS SEVERE":largestClusterShare>=.60||largestComponentShare>=.50?"CONCENTRATED":metrics.historicalCvar>acc.equity*.05?"HIGH TAIL RISK":"NORMAL";
   $("portLargest").textContent=(largestShare*100).toFixed(1)+"%";$("portCorr").textContent=avgAbsCorr.toFixed(2);$("portVar").textContent=money(metrics.historicalVar);$("portCvar").textContent=money(metrics.historicalCvar);$("portRiskMult").textContent=riskMult.toFixed(2)+"×";$("portStatus").textContent=status;
   $("portfolioCorr").innerHTML=renderCorrMatrix(pos.map(x=>x.symbol),pos.map((_,i)=>aligned.matrix.map(r=>r[i])));
   renderStrategyFamilies();await assessCurrentSetupPortfolioRisk(false)
 }catch(e){$("portStatus").textContent="UNAVAILABLE";$("portfolioCorr").innerHTML=`<div class="emptyState">Portfolio risk unavailable: ${escapeHtml(e.message)}</div>`;renderPortfolioBudgets([]);renderStrategyFamilies()}
}
function paperExit(t,price,qty,label){
 paperMigrateTrade(t);return paperExitSim(t,price,qty,label,Math.max(1,+appSettings().slippageBps||0),true,Date.now())
}
function drawPaperEquity(){
 const cv=$("paperEquityCurve");if(!cv)return;const ctx=cv.getContext("2d"),st=paperAccountStats(),a=[...paperHistory(),{ts:Date.now(),equity:st.equity}],w=cv.width,h=cv.height,pad=18;ctx.clearRect(0,0,w,h);if(a.length<2)return;const vals=a.map(x=>x.equity),mn=Math.min(...vals),mx=Math.max(...vals),rg=mx-mn||1,x=i=>pad+i/(a.length-1)*(w-2*pad),y=v=>h-pad-(v-mn)/rg*(h-2*pad);ctx.strokeStyle="#69a7ff";ctx.lineWidth=2;ctx.beginPath();a.forEach((v,i)=>i?ctx.lineTo(x(i),y(v.equity)):ctx.moveTo(x(i),y(v.equity)));ctx.stroke()
}
// v74.6: la pornire o cereau 3-4 functii deodata (4 cereri identice). Acum
// prima cerere e tinuta minte; doar activarea notificarilor (actiunea omului) o reia.
let pushConfigPromis=null;
function pushServerConfig(reia=false){
 if(!reia&&pushConfigPromis)return pushConfigPromis;
 return pushConfigPromis=pushServerConfigCitire();
}
async function pushServerConfigCitire(){
 try{const r=await getJSON("/api/push?action=config");window.__pushServerConfig=r;if($("pushServerStatus"))$("pushServerStatus").textContent=!r.configured?"NEEDS CONFIG":r.deliverySenderConfigured?"READY":"SUBSCRIBE READY · SENDER NEEDED";return r}catch(e){if($("pushServerStatus"))$("pushServerStatus").textContent="UNAVAILABLE";return {configured:false}}
}
function b64ToU8(s){const pad="=".repeat((4-s.length%4)%4),b=(s+pad).replace(/-/g,"+").replace(/_/g,"/"),raw=atob(b);return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)))}
async function enablePushAlerts(){
 if(!("serviceWorker" in navigator)||!("PushManager" in window)){toast("Push API unsupported","warn");return}
 const cfg=await pushServerConfig(true);if(!cfg.configured||!cfg.publicKey){toast("Push server needs VAPID_PUBLIC_KEY + PUSH_SUBSCRIPTIONS KV","warn");return}
 const perm=await Notification.requestPermission();if(perm!=="granted"){renderPushStatus();return}
 const reg=await navigator.serviceWorker.ready;let sub=await reg.pushManager.getSubscription();if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64ToU8(cfg.publicKey)});
 const r=await apiFetch("/api/push?action=subscribe",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(sub)});const d=await r.json();window.__pushState=d.saved?(cfg.deliverySenderConfigured?"SUBSCRIBED":"SUBSCRIBED · SENDER NEEDED"):"ERROR";renderPushStatus();renderDailyDesk();toast(d.saved?(cfg.deliverySenderConfigured?"Push subscription active":"Subscription saved; closed-app sender/monitor still needs Cloudflare configuration."):"Push subscription not saved",d.saved?"good":"warn")
}
async function disablePushAlerts(){
 try{const reg=await navigator.serviceWorker.ready,sub=await reg.pushManager.getSubscription();if(sub){await apiFetch("/api/push?action=unsubscribe",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({endpoint:sub.endpoint})}).catch(()=>{});await sub.unsubscribe()}}catch{}window.__pushState="OFF";renderPushStatus();renderDailyDesk()
}
async function renderPushStatus(){
 if($("notifStatus"))$("notifStatus").textContent=typeof Notification==="undefined"?"Unsupported":Notification.permission;
 const cfg=window.__pushServerConfig||await pushServerConfig();let sub=null;try{if(navigator.serviceWorker?.ready){const reg=await navigator.serviceWorker.ready;sub=await reg.pushManager?.getSubscription()}}catch{}
 window.__pushState=sub?(cfg.deliverySenderConfigured?"SUBSCRIBED":"SUBSCRIBED · SENDER NEEDED"):cfg.configured?"READY TO SUBSCRIBE":"NEEDS SERVER";if($("pushSubStatus"))$("pushSubStatus").textContent=window.__pushState
}
async function accountApi(action,symbol=""){
 const q=`/api/pionex-account?action=${encodeURIComponent(action)}${symbol?`&symbol=${encodeURIComponent(symbol)}`:""}`;return getJSON(q)
}
async function loadPionexAccount(){
 if(assetClass()==="STOCKS"){$("acctConfig").textContent="N/A · STOCK MODE";return}
 $("acctConfig").textContent="Checking…";try{const st=await accountApi("status");window.__pionexAccountConfigured=!!st.configured;$("acctConfig").textContent=st.configured?"CONFIGURED":"NEEDS SERVER SECRETS";if(!st.configured){$("acctBalanceRows").innerHTML='<div class="emptyState">Set PIONEX_API_KEY and PIONEX_API_SECRET as Cloudflare secrets with read permission.</div>';renderDailyDesk();return}
 const d=await accountApi("balances"),rows=(d.data?.balances||[]).filter(x=>+x.free||+x.frozen);$("acctAssets").textContent=rows.length;$("acctBalanceRows").innerHTML=rows.length?`<div class="accountRow"><div class="accountCell">Coin</div><div class="accountCell">Free</div><div class="accountCell">Frozen</div><div class="accountCell">Total</div></div>`+rows.map(x=>`<div class="accountRow"><div class="accountCell">${escapeHtml(x.coin)}</div><div class="accountCell">${escapeHtml(x.free)}</div><div class="accountCell">${escapeHtml(x.frozen)}</div><div class="accountCell">${(+x.free+ +x.frozen).toFixed(8)}</div></div>`).join(""):'<div class="emptyState">No non-zero balances.</div>';renderDailyDesk()
 }catch(e){$("acctConfig").textContent="ERROR";$("acctBalanceRows").innerHTML=`<div class="emptyState">${escapeHtml(e.message)}</div>`}
}
async function loadPionexOpenOrders(){
 if(assetClass()==="STOCKS"){$("acctOrderRows").innerHTML='<div class="emptyState">Pionex account is crypto-only.</div>';return}
 const symbol=`${coin(norm($("symbol").value))}_USDT`;$("acctOrderRows").innerHTML="Loading…";try{const d=await accountApi("openOrders",symbol),rows=d.data?.orders||[];$("acctOrders").textContent=rows.length;$("acctOrderRows").innerHTML=rows.length?`<div class="accountRow"><div class="accountCell">Side / Type</div><div class="accountCell">Price</div><div class="accountCell">Size</div><div class="accountCell">Status</div></div>`+rows.map(x=>`<div class="accountRow"><div class="accountCell">${escapeHtml(x.side)} · ${escapeHtml(x.type)}</div><div class="accountCell">${escapeHtml(x.price||"—")}</div><div class="accountCell">${escapeHtml(x.size||x.amount||"—")}</div><div class="accountCell">${escapeHtml(x.status||"—")}</div></div>`).join(""):'<div class="emptyState">No open orders for '+symbol+'.</div>'}catch(e){$("acctOrderRows").innerHTML=`<div class="emptyState">${escapeHtml(e.message)}</div>`}
}

const NDX_SNAPSHOT_DATE="2026-09-18";
const NDX_HISTORY_COVERAGE_START="2025-12-22";
function referenceSnapshotAge(date){const t=Date.parse(String(date||"")+"T00:00:00Z");return Number.isFinite(t)?Math.max(0,(Date.now()-t)/86400000):Infinity}
function referenceSnapshotState(date,warnDays=30,staleDays=90){const age=referenceSnapshotAge(date),state=age>=staleDays?"STALE":age>=warnDays?"AGING":"FRESH";return {date,age,state,warnDays,staleDays,label:`${state} · ${Number.isFinite(age)?age.toFixed(0):"?"}d old`}}
// v74.6: lista de monede Pionex se schimba zilnic - o rezerva de 4 zile nu e
// "FRESH". Pragurile: 1 zi = AGING, 3 zile = STALE (NDX ramane pe 30/90).
function pionexSnapshotState(date){return referenceSnapshotState(date,1,3)}
function referenceDataGovernance(){return {nasdaq:referenceSnapshotState(NDX_SNAPSHOT_DATE,30,90),pionex:pionexSnapshotState(PIONEX_FALLBACK_SNAPSHOT_DATE),ts:Date.now()}}
const NDX_UNIVERSE=["ADBE","AMD","ABNB","ALNY","GOOGL","GOOG","AMZN","AEP","AMGN","ADI","AAPL","AMAT","APP","ARM","ASML","ADSK","ADP","AXON","BKR","BKNG","AVGO","CDNS","CTAS","CSCO","CCEP","CMCSA","CEG","CPRT","COST","CRWD","CSX","DASH","DDOG","DXCM","FANG","EXC","FAST","FER","FTNT","GEHC","GILD","HON","HONA","IDXX","INTC","INTU","ISRG","KDP","KLAC","LITE","LRCX","LIN","MAR","MRVL","MELI","META","MCHP","MU","MSFT","MSTR","MDLZ","MPWR","MNST","NFLX","NVDA","NXPI","ORLY","ODFL","PCAR","PLTR","PANW","PAYX","PYPL","PDD","PEP","QCOM","REGN","ROP","ROST","SNDK","STX","SHOP","SBUX","SNPS","TMUS","TTWO","TSLA","TXN","TRI","VRTX","WMT","WBD","WDC","WDAY","XEL","ALAB","CRWV","NBIS","RKLB","TER","SPCX"];
const NDX_CORE30=["AAPL","MSFT","NVDA","AMZN","GOOGL","GOOG","META","AVGO","TSLA","AMD","COST","NFLX","PLTR","MU","AMAT","QCOM","LRCX","INTC","ARM","ASML","APP","CRWD","PANW","SHOP","SPCX","CRWV","RKLB","ALAB","TER","MSTR"];
const NDX_MEMBERSHIP_EVENTS=[{"date":"2025-12-22","added":["ALNY","FER","INSM","MPWR","STX","WDC"],"removed":["BIIB","CDW","GFS","LULU","ON","TTD"],"kind":"ANNUAL_RECONSTITUTION","confidence":"OFFICIAL","source":"NASDAQ"},{"date":"2026-01-05","added":["VSNT"],"removed":[],"kind":"SPINOFF","confidence":"RECONCILED","source":"CORPORATE_ACTION"},{"date":"2026-01-09","added":[],"removed":["VSNT"],"kind":"OFF_CYCLE_DELETION","confidence":"RECONCILED","source":"INDEX_HISTORY"},{"date":"2026-01-20","added":["WMT"],"removed":["AZN"],"kind":"OFF_CYCLE_REPLACEMENT","confidence":"OFFICIAL","source":"NASDAQ"},{"date":"2026-04-20","added":["SNDK"],"removed":["TEAM"],"kind":"OFF_CYCLE_REPLACEMENT","confidence":"OFFICIAL","source":"NASDAQ"},{"date":"2026-05-18","added":["LITE"],"removed":["CSGP"],"kind":"OFF_CYCLE_REPLACEMENT","confidence":"OFFICIAL","source":"NASDAQ"},{"date":"2026-06-22","added":["ALAB","CRWV","NBIS","RKLB","TER"],"removed":["CHTR","CTSH","INSM","VRSK","ZS"],"kind":"QUARTERLY_RECONSTITUTION","confidence":"OFFICIAL","source":"NASDAQ"},{"date":"2026-06-29","added":["HONA"],"removed":[],"kind":"SPINOFF","confidence":"RECONCILED","source":"CORPORATE_ACTION"},{"date":"2026-07-07","added":["SPCX"],"removed":[],"kind":"FAST_ENTRY","confidence":"OFFICIAL","source":"NASDAQ"},{"date":"2026-08-05","added":[],"removed":["EA"],"kind":"TAKE_PRIVATE","confidence":"RECONCILED","source":"CORPORATE_ACTION"},{"date":"2026-09-14","added":[],"removed":["KHC"],"kind":"EXCHANGE_TRANSFER","confidence":"RECONCILED","source":"CORPORATE_ACTION"}];
function ndxDayTs(date){const t=Date.parse(String(date||"").slice(0,10)+"T00:00:00Z");return Number.isFinite(t)?t:NaN}
function ndxUniverseAt(ts){
  const target=+ts||Date.now(),coverageStart=ndxDayTs(NDX_HISTORY_COVERAGE_START),snapshotTs=ndxDayTs(NDX_SNAPSHOT_DATE),set=new Set(NDX_UNIVERSE),applied=[];
  const ev=[...NDX_MEMBERSHIP_EVENTS].map(x=>({...x,ts:ndxDayTs(x.date)})).filter(x=>Number.isFinite(x.ts)).sort((a,b)=>b.ts-a.ts);
  for(const e of ev){if(e.ts<=target)continue;for(const x of e.added||[])set.delete(x);for(const x of e.removed||[])set.add(x);applied.push(e)}
  const reconstructed=target>=coverageStart&&target<=snapshotTs+86400000,uncertain=applied.filter(x=>x.confidence!=="OFFICIAL"),coverage=target<coverageStart?"OUTSIDE_COVERAGE":reconstructed?(uncertain.length?"RECONSTRUCTED_MIXED":"RECONSTRUCTED_OFFICIAL"):"CURRENT_REFERENCE";
  return {symbols:[...set],count:set.size,targetTs:target,targetDate:new Date(target).toISOString().slice(0,10),snapshotDate:NDX_SNAPSHOT_DATE,coverageStart:NDX_HISTORY_COVERAGE_START,coverage,reconstructed,eventsReversed:applied.length,uncertainEvents:uncertain.map(x=>x.date+":"+x.kind),bias:reconstructed?"REDUCED_NOT_ELIMINATED":"REFERENCE_SNAPSHOT_BIAS",source:"NASDAQ current constituents + dated membership events"}
}
function ndxFastUniverseAt(meta){const set=new Set(meta?.symbols||[]),out=NDX_CORE30.filter(x=>set.has(x));for(const x of (meta?.symbols||[]))if(out.length<30&&!out.includes(x))out.push(x);return out.slice(0,30)}
let stockLiveTimer=null,stockLiveSeq=0,stockContextCache={ts:0,symbol:null,data:null},stockProviderConfig=null;

function assetClass(){
  return $("assetClass")?.value||localStorage.getItem("assetClass")||"CRYPTO"
}
function stockSymbol(s){
  return (s||"AAPL").trim().toUpperCase().replace(/[^A-Z0-9.\-]/g,"").slice(0,15)||"AAPL"
}
function marketSymbol(s){
  return assetClass()==="STOCKS"?stockSymbol(s):((s||"BTC").trim().toUpperCase().replace(/[^A-Z0-9]/g,"").endsWith("USDT")?(s||"BTC").trim().toUpperCase().replace(/[^A-Z0-9]/g,""):(s||"BTC").trim().toUpperCase().replace(/[^A-Z0-9]/g,"")+"USDT")
}
function marketLabelSymbol(sym){
  return assetClass()==="STOCKS"?stockSymbol(sym):coin(sym)
}
function setAssetClass(v){
  const market=v==="STOCKS"?"STOCKS":"CRYPTO",prev=assetClass();
  localStorage.setItem("assetClass",market);if($("assetClass"))$("assetClass").value=market;
  document.body.classList.toggle("marketModeStock",market==="STOCKS");document.body.classList.toggle("marketModeCrypto",market==="CRYPTO");
  if(market==="STOCKS"){
    if($("analysisSource")){$("analysisSource").value="TWELVEDATA";$("analysisSource").disabled=true}
    if(prev!=="STOCKS"||!$("symbol").value||/USDT$/i.test($("symbol").value))$("symbol").value=localStorage.getItem("lastStock")||"AAPL";
    if($("symbol"))$("symbol").placeholder="AAPL, NVDA, TSLA, MSFT...";
  }else{
    const cp=localStorage.getItem("analysisProvider")||appSettings().spotProvider||"BINANCE";
    if($("analysisSource")){$("analysisSource").disabled=false;$("analysisSource").value=cp}
    if(prev!=="CRYPTO"||!$("symbol").value||NDX_UNIVERSE.includes(stockSymbol($("symbol").value)))$("symbol").value=localStorage.getItem("lastCrypto")||"BTC";
    if($("symbol"))$("symbol").placeholder="BTC, ETH, SOL...";
  }
  stopProviderLive();stopLiquidationTape();invalidateDecisionContext(null,null,null,true);window.__radarState=null;window.__signalState=null;window.__stockEarnings=null;window.__portfolioRisk=null;window.__structureV38=null;marketCache={ts:0,rows:[],source:null};scannerRows=[];
  updateSourceLineage(analysisSource());updateScannerUi();setScanUniverseStatus("PIONEX_SNAPSHOT","Fallback ready · live Pionex will replace it when available.");syncTop(norm($("symbol").value),$("tf").value,$("mode").value);renderLists();renderOpportunity();renderDailyDesk();
  if($("volume24Label"))$("volume24Label").textContent=market==="STOCKS"?"Daily $ volume":"Volum 24H USDT";
  if($("fearGreed"))$("fearGreed").textContent=market==="STOCKS"?"N/A":"—";
  if($("sentimentText"))$("sentimentText").textContent=market==="STOCKS"?"Crypto Fear & Greed is not used in US stock scoring.":"Sentiment extern opțional; engine-ul tehnic nu depinde de el.";
  $("status").textContent=market==="STOCKS"?"US Stocks mode · configure Twelve Data in Cloudflare if needed.":"Crypto mode · Binance stable default.";
  toast(market==="STOCKS"?"US Stocks / Nasdaq mode":"Crypto mode","good");renderProfitReadiness(false)
}
function openStocksDesk(){setAssetClass("STOCKS");navTo("stocks",true)}

const stockCorporateActionGuards=new Map();
async function stockApi(action,args={}){
  const q=new URLSearchParams({action,...Object.fromEntries(Object.entries(args).map(([k,v])=>[k,String(v)]))});
  return getJSON("/api/stocks?"+q.toString())
}
async function stockConfig(force=false){
  if(stockProviderConfig&&!force)return stockProviderConfig;
  stockProviderConfig=await stockApi("config");return stockProviderConfig
}
async function stockSeries(symbol,tf="1d",limit=300){
  const key=cacheKey("stocks-series",`${symbol}|${tf}|${limit}`);
  return memoRequest(key,tf==="15m"?15000:tf==="1h"?30000:tf==="4h"?60000:120000,async()=>{
    const sym=stockSymbol(symbol),d=await stockApi("series",{symbol:sym,tf,limit:Math.min(1000,Math.max(100,limit))});
    if(!d?.rows?.length)throw Error(d?.error||"No stock candles");stockCorporateActionGuards.set(`${sym}|${tf}`,d.corporateActionGuard||{guarded:false});
    if(d.corporateActionGuard?.guarded&&d.rows.length<80)throw Error("Corporate-action guard left insufficient clean intraday history");return d.rows
  })
}
async function stockTicker(symbol){
  const key=cacheKey("stocks-quote",stockSymbol(symbol));
  return memoRequest(key,15000,async()=>{
    const d=await stockApi("quote",{symbol:stockSymbol(symbol)});
    if(!d?.quote)throw Error(d?.error||"No stock quote");
    return d.quote
  })
}
async function stockBatchSeries(symbols,tf="1d",limit=260){
  const d=await stockApi("batch_series",{symbols:symbols.join(","),tf,limit});
  if(!d?.data)throw Error(d?.error||"Stock batch unavailable");for(const [sym,x] of Object.entries(d.data))if(x?.corporateActionGuard)stockCorporateActionGuards.set(`${sym}|${tf}`,x.corporateActionGuard);return d.data
}
function stockSessionState(){
  const parts=new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",weekday:"short",hour:"2-digit",minute:"2-digit",hour12:false}).formatToParts(new Date()),o={};
  parts.forEach(x=>o[x.type]=x.value);const wd=o.weekday,h=+o.hour,m=+o.minute,min=h*60+m;
  if(["Sat","Sun"].includes(wd))return {state:"CLOSED",cls:"sessionClosed"};
  if(min>=240&&min<570)return {state:"PRE-MARKET",cls:"sessionPre"};
  if(min>=570&&min<960)return {state:"REGULAR",cls:"sessionOpen"};
  if(min>=960&&min<1200)return {state:"AFTER-HOURS",cls:"sessionAfter"};
  return {state:"CLOSED",cls:"sessionClosed"}
}
function stockFreshnessLabel(tick){
  const ts=Number(tick?.timestamp||0);if(!ts)return tick?.isMarketOpen?"LATEST AVAILABLE":"EOD / LATEST";
  const age=Math.max(0,Date.now()-ts);return age<120000?"LIVE / <2m":age<20*60000?`DELAYED · ${Math.round(age/60000)}m`:"LATEST AVAILABLE"
}
function performanceFromRows(rows,n=20){
  if(!rows||rows.length<n+1)return null;const a=+rows[rows.length-1-n][4],b=+rows[rows.length-1][4];return a?(b/a-1)*100:null
}
async function loadStockContext(force=false){
  if(assetClass()!=="STOCKS")return;
  const sym=stockSymbol($("symbol").value),key=sym;
  if(!force&&stockContextCache.symbol===key&&Date.now()-stockContextCache.ts<60000){renderStockContext(stockContextCache.data);return}
  try{
    const [daily,qqqDaily,tick,qqqTick,cfg]=await Promise.all([stockSeries(sym,"1d",80),stockSeries("QQQ","1d",80),stockTicker(sym),stockTicker("QQQ"),stockConfig()]);
    const last=daily[daily.length-1],prev=daily[daily.length-2],avg20=areVolLipsa(daily.slice(-21,-1))?null:daily.slice(-21,-1).reduce((a,x)=>a+(+x[5]||0),0)/Math.max(1,daily.slice(-21,-1).length);
    const gap=prev&&+prev[4]?((+last[1]/+prev[4])-1)*100:null,rvol=avg20&&volBara(last)!==null?volBara(last)/avg20:null,p20=performanceFromRows(daily,20),q20=performanceFromRows(qqqDaily,20);
    const sess=stockSessionState(),data={sym,daily,qqqDaily,tick,qqqTick,cfg,gap,rvol,p20,q20,rs20:Number.isFinite(p20)&&Number.isFinite(q20)?p20-q20:null,prev,sess};
    stockContextCache={ts:Date.now(),symbol:key,data};renderStockContext(data)
  }catch(e){
    if($("stockProviderState"))$("stockProviderState").textContent="UNAVAILABLE";
    if($("stockApiState"))$("stockApiState").textContent=e.message;
  }
}
function renderStockContext(d){
  if(!d)return;const {tick,qqqTick,cfg,gap,rvol,p20,q20,rs20,prev,sess}=d;
  $("stockSession").textContent=sess.state;$("stockSession").className=sess.cls;$("stockFreshness").textContent=stockFreshnessLabel(tick);
  $("stockGap").textContent=Number.isFinite(gap)?pctText(gap):"—";$("stockRvol").textContent=Number.isFinite(rvol)?rvol.toFixed(2)+"x":"—";
  $("stockQqq").textContent=Number.isFinite(+qqqTick.priceChangePercent)?pctText(+qqqTick.priceChangePercent):"—";
  const rel=Number.isFinite(+tick.priceChangePercent)&&Number.isFinite(+qqqTick.priceChangePercent)?+tick.priceChangePercent-+qqqTick.priceChangePercent:null;
  $("stockRelQqq").textContent=Number.isFinite(rel)?pctText(rel):"—";$("stockPdh").textContent=prev?num(+prev[2]):"—";$("stockPdl").textContent=prev?num(+prev[3]):"—";
  const st=window.__radarState;$("stockVwap").textContent=st&&st.source==="TWELVEDATA"&&st.tf!=="1d"?numSau(st.q.calendarVwaps.day):"Intraday only";$("stock20d").textContent=Number.isFinite(p20)?pctText(p20):"—";$("stockQqq20d").textContent=Number.isFinite(q20)?pctText(q20):"—";$("stockRs20d").textContent=Number.isFinite(rs20)?pctText(rs20):"—";
  $("stockProviderState").textContent=cfg?.configured?"READY":"NEEDS API KEY";$("stockProviderState").className="edgeState "+(cfg?.configured?"good":"neutral");$("stockApiState").textContent=cfg?.configured?"SERVER KEY OK":"TWELVE_DATA_API_KEY MISSING";
  $("stockExchange").textContent=tick.exchange||"—";$("stockMarketOpen").textContent=tick.isMarketOpen===true?"YES":tick.isMarketOpen===false?"NO":"—";$("stockLastQuote").textContent=tick.datetime||"—";
}
async function loadStockEarnings(){
  if(assetClass()!=="STOCKS")return;const sym=stockSymbol($("symbol").value);$("stockEarningsDate").textContent="Loading…";
  try{const d=await stockApi("earnings",{symbol:sym}),e=d?.next||null;window.__stockEarnings=e?{symbol:sym,...e}:null;$("stockEarningsDate").textContent=e?.date||"No future date returned";$("stockEarningsMeta").textContent=e?`${e.time||"Time N/A"} · EPS est. ${e.eps_estimate??"—"}`:(d?.note||"Provider returned no future earnings event");renderSetupQuality();renderDailyDesk()}
  catch(e){window.__stockEarnings=null;$("stockEarningsDate").textContent="Unavailable";$("stockEarningsMeta").textContent=e.message}
}
async function checkStocksHealth(){
  try{const d=await stockConfig(true),txt=d.configured?"OK":"NEEDS KEY";if($("healthStocks"))$("healthStocks").textContent=txt;if($("setStockApiState"))$("setStockApiState").textContent=txt;return d.configured}
  catch(e){if($("healthStocks"))$("healthStocks").textContent="FAIL";if($("setStockApiState"))$("setStockApiState").textContent="FAIL";return false}
}
function updateScannerUi(){
  const stocks=assetClass()==="STOCKS";
  if($("scanTitle"))$("scanTitle").textContent=stocks?"Nasdaq-100 Scanner":"Pionex Universe · Binance Engine";
  if($("scanSubtitle")){const ref=referenceDataGovernance();$("scanSubtitle").textContent=stocks?`NDX research universe · snapshot ${NDX_SNAPSHOT_DATE} · ${ref.nasdaq.label} · Twelve Data`:`Univers Pionex SPOT/USDT · analiza tehnică folosește Binance direct · rezerva (snapshot) ${ref.pionex.label}`;}
  if($("scanSourceBadge")){$("scanSourceBadge").textContent=stocks?"NASDAQ / US STOCKS":"PIONEX COINS · BINANCE DATA";$("scanSourceBadge").className=stocks?"stockBadge":"pionexBadge"}
  if($("scanAssetHead"))$("scanAssetHead").textContent=stocks?"Ticker":"Coin";if($("scanTurnoverHead"))$("scanTurnoverHead").textContent=stocks?"Daily $ volume":"24h Turnover";
  if($("scanActionBtn"))$("scanActionBtn").textContent=stocks?"↻ Scan Nasdaq universe":"↻ Rescanează Pionex Top 100";
  if($("scanDepth")){
    const opts=$("scanDepth").options;if(opts&&opts.length>=2){opts[0].textContent=stocks?"FAST · 1D · Core 30":"FAST · 4H · 100 coins";opts[1].textContent=stocks?"FULL · 1D · NDX 101":"DEEP · MTF · 100 coins"}
  }
  if($("pionexScanMode"))$("pionexScanMode").textContent=stocks?($("scanDepth")?.value==="DEEP"?"Mode FULL · NDX 101 · 1D":"Mode FAST · Core 30 · 1D"):($("scanDepth")?.value==="DEEP"?"Mode DEEP MTF · Binance candles":"Mode FAST 4H · Binance candles");
  if($("pionexRateState"))$("pionexRateState").textContent=stocks?"Server-side batch requests":"Pionex universe only · Binance analysis";
  if($("opportunityTitle"))$("opportunityTitle").textContent=stocks?"Opportunity Engine · Nasdaq / US Stocks":"Opportunity Engine · Pionex coins / Binance data";
  if($("oppScanBtn"))$("oppScanBtn").textContent=stocks?"Scan Nasdaq":"Scan Pionex";
}
function stockRowFromSeries(symbol,rows){
  if(!rows||rows.length<60)return null;const q=calc(rows,$("mode")?.value||"auto"),last=rows[rows.length-1],prev=rows[rows.length-2],price=+last[4],change=prev&&+prev[4]?((price/+prev[4])-1)*100:0,turnover=botiNr(last[5])===null?null:price*+last[5];
  return {c:symbol,stockSymbol:symbol,avg:q.score,dir:q.ver,conf:q.confluence,adx:q.adx,regime:q.regime,turnover,change,source:"TWELVEDATA",trend:q.trendScore,mom:q.momScore,structure:q.structureScore,volume:q.volScore,chop:q.chop,efficiency:q.efficiency,hurst:q.hurst,rvPercentile:q.rvPercentile}
}
async function runNasdaqScan(depth="FAST"){
  if($("scanDepth"))$("scanDepth").value=depth;setAssetClass("STOCKS");show("scan");return scanStocks()
}
async function scanStocks(){
  let box=$("scanout"),depth=$("scanDepth")?.value||"FAST",universe=depth==="DEEP"?NDX_UNIVERSE:NDX_CORE30;
  if(activeScanToken)activeScanToken.cancelled=true;const token={cancelled:false,id:Date.now()},started=performance.now();activeScanToken=token;scannerRows=[];perfStats.lastScanner="STOCKS RUNNING";
  const ndxRef=referenceSnapshotState(NDX_SNAPSHOT_DATE,30,90);if(depth==="DEEP"&&ndxRef.state==="STALE"&&!confirm(`Nasdaq reference universe is ${ndxRef.label}. Continue a full-universe research scan with stale membership?`))return;scanButonStop(true);$("scanProgressBar").style.width="0%";$("scanProcessed").textContent=`0/${universe.length}`;$("scanResults").textContent="0";$("scanErrors").textContent="0";$("scanCacheHits").textContent="—";$("scanElapsed").textContent="0s";$("pionexUniverseCount").textContent=`Universe ${universe.length}/${NDX_UNIVERSE.length}`;$("pionexUniverseTime").textContent=`Snapshot ${NDX_SNAPSHOT_DATE} · ${ndxRef.label}`;updateScannerUi();
  box.innerHTML="Loading Nasdaq daily history via Twelve Data…";
  try{
    const cfg=await stockConfig(true);if(!cfg.configured)throw Error("TWELVE_DATA_API_KEY is not configured in Cloudflare");
    let done=0,errors=0,out=[];const chunks=[];for(let i=0;i<universe.length;i+=15)chunks.push(universe.slice(i,i+15));
    for(const batch of chunks){
      if(token.cancelled)break;
      try{
        const data=await stockBatchSeries(batch,"1d",260);
        for(const sym of batch){const x=stockRowFromSeries(sym,data[sym]?.rows||data[sym]||[]);if(x)out.push(x);else errors++;done++}
      }catch(e){errors+=batch.length;done+=batch.length}
      scannerRows=out;$("scanProgressBar").style.width=(100*done/universe.length).toFixed(1)+"%";$("scanProcessed").textContent=`${done}/${universe.length}`;$("scanResults").textContent=out.length;$("scanErrors").textContent=errors;$("scanElapsed").textContent=((performance.now()-started)/1000).toFixed(1)+"s";renderScan()
    }
    if(token.cancelled){box.innerHTML='<div class="row"><span>Stock scan stopped.</span></div>';return}
    scannerRows=out;renderScan();const scanBreadth=v64BreadthFromAnalysisRows(scannerRows,{market:assetClass(),source:analysisSource(),total:scannerRows.length,depth:"SCANNER",universe:"CURRENT SCANNER RESULTS"});if(!window.__marketBreadthV64||Date.now()-(+window.__marketBreadthV64.ts||0)>10*60000)renderMarketBreadthV64(scanBreadth);renderOpportunity();renderDailyDesk();perfStats.lastScanner=`STOCKS OK ${out.length}/${universe.length}`;persistScannerHistory("STOCKS","TWELVEDATA",universe.length,out,depth).catch(()=>{});toast(`Nasdaq scanner: ${out.length}/${universe.length} analyzed`,"good")
  }catch(e){scannerRows=[];box.innerHTML=`<div class="row"><span>US Stocks scanner unavailable.</span><b>${escapeHtml(e.message)}</b></div>`;perfStats.lastScanner="STOCKS ERROR · "+e.message;toast("US stock data unavailable: "+e.message,"bad")}
  finally{if(activeScanToken===token){activeScanToken=null;scanButonStop(false)}$("scanElapsed").textContent=((performance.now()-started)/1000).toFixed(1)+"s"}
}
function selectStockScan(c){setAssetClass("STOCKS");$("symbol").value=c;localStorage.setItem("lastStock",c);show("dash");analyze(true)}

const HISTORY_SNAPSHOT_TTL=5*60*1000;
let lastHistorySnapshotKey="",lastHistorySnapshotTs=0;

async function historyApi(action,args={},method="GET",body=null){
  const q=new URLSearchParams({action,...Object.fromEntries(Object.entries(args).map(([k,v])=>[k,String(v)]))});
  const opt={method,headers:{"accept":"application/json"}};
  if(body!==null){opt.headers["content-type"]="application/json";opt.body=JSON.stringify(body)}
  const r=await apiFetch("/api/history?"+q.toString(),opt),raw=await r.text();let d;try{d=JSON.parse(raw)}catch{throw Error("History API invalid response · HTTP "+r.status)}
  if(!r.ok||d?.error)throw Error(d?.error||("History API HTTP "+r.status));return d
}
async function historyStatus(){
  try{return await historyApi("status")}catch(e){return {configured:false,error:e.message}}
}
async function persistScannerHistory(market,provider,universe,rows,mode="CLIENT"){
  if(!rows?.length)return false;
  const ts=Date.now(),items=rows.slice(0,120).map((x,i)=>({rank:i+1,symbol:x.c||x.symbol,source:x.source||provider,bias:x.dir||x.bias||"NEUTRAL",score:+x.avg||+x.oppScore||0,confidence:+x.conf||0,adx:+x.adx||0,regime:x.regime||"",price:+x.price||null,changePct:+x.change||0,turnover:+x.turnover||0,payload:x})),top=[...rows].map(opportunityScore).sort((a,b)=>b.oppScore-a.oppScore)[0]||null,payload={ts,market,provider,mode,universeN:universe,processedN:rows.length,status:"OK",topSymbol:top?.c||items[0]?.symbol||null,topScore:top?.oppScore??items[0]?.score??null,items};
  await localDbPutRecord("scanner_runs",`${ts}|${market}|${provider}|${mode}`,payload,ts);
  try{await historyApi("scanner_run",{},"POST",payload);return true}catch{return true}
}
async function persistCurrentSnapshot(force=false){
  const st=window.__radarState,ss=window.__signalState;if(!st||!ss){if(force)toast("Run analysis first","warn");return false}
  const key=[assetClass(),st.symbol,st.tf,st.mode,st.source].join("|"),now=Date.now();if(!force&&key===lastHistorySnapshotKey&&now-lastHistorySnapshotTs<HISTORY_SNAPSHOT_TTL)return false;
  const q=st.q,sm=ss.sm,tm=ss.tm,opp=setupQualityCurrent(),payload={ts:now,market:assetClass(),symbol:st.symbol,source:st.source||analysisSource(),tf:st.tf,mode:st.mode,score:q.score,opportunity:opp?.overall??null,regime:q.regime,direction:tm.direction,confidence:Math.max(sm.long,sm.short),price:q.price,payload:{trend:q.trendScore,momentum:q.momScore,volume:q.volScore,structure:q.structureScore,adx:q.adx,atrPct:q.atrPct,setupGrade:opp?.grade||null,blocker:opp?.blocker||null,session:window.__structureV38&&st.j?.length?sessionForTs(st.j.at(-1)[0]):null,sweepScore:window.__structureV38?.sweep?.score??null,sweepType:window.__structureV38?.sweep?.type??null,fvgStatus:window.__structureV38?.nearestFvg?.status??null,premiumDiscount:window.__structureV38?.premiumDiscount?.zone??null,frictionBps:window.__structureV38?.friction?.roundTripBps??null}};
  await localDbPutRecord("snapshots",`${now}|${st.symbol}|${st.tf}|${st.mode}`,payload,now);lastHistorySnapshotKey=key;lastHistorySnapshotTs=now;
  try{await historyApi("snapshot",{},"POST",payload);if(force)toast("Research snapshot saved locally + D1","good")}catch(e){if(force)toast("Research snapshot saved locally · D1 unavailable","warn")}
  return true
}
async function persistSignalHistory(sig){
  if(!sig)return false;await archiveSignalRows([sig]);
  try{await historyApi("signal",{},"POST",{signal:sig});return true}catch{return true}
}
async function persistEventHistory(type,title,message,payload={}){
  try{await historyApi("event",{},"POST",{type,market:assetClass(),symbol:window.__radarState?.symbol||null,source:analysisSource(),severity:"INFO",title,message,payload});return true}catch{return false}
}
function cloudRunHtml(x){
  return `<div class="cloudRow"><div class="cloudCell">${new Date(+x.ts).toLocaleString()}</div><div class="cloudCell">${escapeHtml(x.market||"—")}</div><div class="cloudCell">${escapeHtml(x.status||"—")}</div><div class="cloudCell">${Number.isFinite(+x.processed_n)?+x.processed_n:"—"}/${Number.isFinite(+x.universe_n)?+x.universe_n:"—"}</div><div class="cloudCell">${escapeHtml(x.top_symbol||"—")} ${Number.isFinite(+x.top_score)?"· "+(+x.top_score).toFixed(0):""}</div></div>`
}
function cloudOppHtml(x){
  const market=x.market==="STOCKS"?"STOCKS":"CRYPTO",symbol=safeActionToken(x.symbol,24);
  return `<div class="cloudRow"><div class="cloudCell">${Number.isFinite(+x.rank)?+x.rank:"—"}</div><div class="cloudCell" data-action-click="selectCloudOpportunity(&#x27;${market}&#x27;,&#x27;${symbol}&#x27;)">${escapeHtml(symbol||"—")}</div><div class="cloudCell">${escapeHtml(x.bias||"—")}</div><div class="cloudCell">${Number.isFinite(+x.score)?(+x.score).toFixed(0):"—"}</div><div class="cloudCell">${escapeHtml(x.regime||"—")}</div></div>`
}
function selectCloudOpportunity(market,symbol){setAssetClass(market==="STOCKS"?"STOCKS":"CRYPTO");$("symbol").value=coin(symbol);show("dash");analyze(true)}
async function loadCloudHistory(){
  try{
    const [runs,opps]=await Promise.all([historyApi("recent_runs",{limit:12}),historyApi("latest_opportunities",{limit:15})]);
    $("cloudRuns").innerHTML=runs.rows?.length?`<div class="cloudRow"><div class="cloudCell">Time</div><div class="cloudCell">Market</div><div class="cloudCell">Status</div><div class="cloudCell">Processed</div><div class="cloudCell">Top</div></div>`+runs.rows.map(cloudRunHtml).join(""):'<div class="emptyState">No scheduled runs stored.</div>';
    $("cloudOpps").innerHTML=opps.rows?.length?`<div class="cloudRow"><div class="cloudCell">Rank</div><div class="cloudCell">Symbol</div><div class="cloudCell">Bias</div><div class="cloudCell">Score</div><div class="cloudCell">Regime</div></div>`+opps.rows.map(cloudOppHtml).join(""):'<div class="emptyState">No server opportunities stored.</div>';
    return {runs,opps}
  }catch(e){$("cloudRuns").innerHTML=`<div class="emptyState">${escapeHtml(e.message)}</div>`;$("cloudOpps").innerHTML='<div class="emptyState">Cloud history unavailable.</div>';return null}
}
async function runCloudMonitorNow(){
  try{
    toast("Starting Cloud Monitor…","good");
    const r=await apiFetch("/api/monitor?action=run",{method:"POST",headers:{"content-type":"application/json"}}),raw=await r.text();let d;try{d=JSON.parse(raw)}catch{throw Error("Monitor proxy invalid response")}
    if(!r.ok||d?.error)throw Error(d?.error||("HTTP "+r.status));
    toast("Cloud Monitor run completed","good");await loadCloudMonitor(true)
  }catch(e){toast("Cloud Monitor unavailable: "+e.message,"warn")}
}
async function loadCloudMonitor(loadHistory=true){
  const [st,push,mon]=await Promise.all([historyStatus(),pushServerConfig().catch(()=>({})),getJSON("/api/monitor").catch(()=>({configured:false}))]);
  const dbOk=!!(st.configured&&st.schemaOk);
  $("cloudDb").textContent=dbOk?"READY":st.configured?"SCHEMA NEEDED":"NOT CONFIGURED";$("cloudDb").className="cloudState "+(dbOk?"cloudOk":"cloudWarn");
  const senderReady=!!(mon?.worker?.pushConfigured||push.deliverySenderConfigured);$("cloudPushSender").textContent=senderReady?"READY":push.configured?"SENDER NEEDED":"NOT CONFIGURED";
  if($("healthHistory"))$("healthHistory").textContent=dbOk?"OK":st.configured?"SCHEMA":"N/A";
  if($("healthMonitor"))$("healthMonitor").textContent=mon?.worker?.ok?"ONLINE":mon?.configured?"UNREACHABLE":"N/A";
  if(!dbOk){$("cloudLastRun").textContent=$("cloudLastMarket").textContent=$("cloudTopSymbol").textContent=$("cloudTopScore").textContent="—";return}
  try{
    const d=await historyApi("recent_runs",{limit:1}),x=d.rows?.[0];
    $("cloudLastRun").textContent=x?new Date(+x.ts).toLocaleString():"No runs";$("cloudLastMarket").textContent=x?.market||"—";$("cloudTopSymbol").textContent=x?.top_symbol||"—";$("cloudTopScore").textContent=Number.isFinite(+x?.top_score)?(+x.top_score).toFixed(0):"—";if($("healthMonitor"))$("healthMonitor").textContent=x?.status||"NO RUNS";
    if(loadHistory)await loadCloudHistory()
  }catch(e){if($("healthMonitor"))$("healthMonitor").textContent="FAIL"}
}

function distributedVolumeProfile(j,bins=48,look=240){
 const rows=j.slice(-look);if(!rows.length||areVolLipsa(rows))return null;const hi=Math.max(...rows.map(x=>+x[2])),lo=Math.min(...rows.map(x=>+x[3])),step=(hi-lo)/bins||1,vol=Array(bins).fill(0),tpo=Array(bins).fill(0);
 for(const x of rows){const l=+x[3],h=+x[2],v=+x[5]||0,a=Math.max(0,Math.min(bins-1,Math.floor((l-lo)/step))),b=Math.max(0,Math.min(bins-1,Math.floor((h-lo)/step))),n=Math.max(1,b-a+1),share=v/n;for(let k=a;k<=b;k++){vol[k]+=share;tpo[k]++}}
 const total=vol.reduce((a,b)=>a+b,0),pocIdx=vol.indexOf(Math.max(...vol)),pairs=vol.map((v,i)=>({i,v})).sort((a,b)=>b.v-a.v);let acc=0,sel=[];for(const q of pairs){sel.push(q.i);acc+=q.v;if(acc>=total*.70)break}
 const mid=i=>lo+(i+.5)*step,nodes=[];for(let i=1;i<bins-1;i++){if(vol[i]>vol[i-1]&&vol[i]>=vol[i+1])nodes.push({type:"HVN",i,price:mid(i),value:vol[i]});if(vol[i]<vol[i-1]&&vol[i]<=vol[i+1])nodes.push({type:"LVN",i,price:mid(i),value:vol[i]})}
 const sortedNodes=nodes.sort((a,b)=>a.type===b.type?b.value-a.value:a.type==="HVN"?-1:1).slice(0,12),singles=tpo.map((v,i)=>({v,i})).filter(x=>x.v===1),tpoPoc=tpo.indexOf(Math.max(...tpo));
 return {rows,hi,lo,step,vol,tpo,total,poc:mid(pocIdx),pocIdx,val:mid(Math.min(...sel)),vah:mid(Math.max(...sel)),nodes:sortedNodes,singleCount:singles.length,tpoPoc:mid(tpoPoc),mid}
}
function developingPoc(j,bins=48){
 const spans=[40,80,120,200].filter(x=>j.length>=x),out=[];for(const n of spans){const p=distributedVolumeProfile(j,bins,n);if(p)out.push({bars:n,poc:p.poc})}return out
}
function initialBalanceProxy(j){
 const rows=j.slice(-80);if(!rows.length)return null;const n=Math.max(2,Math.ceil(rows.length*.20)),a=rows.slice(0,n);return {high:Math.max(...a.map(x=>+x[2])),low:Math.min(...a.map(x=>+x[3])),bars:n}
}
function swingClusters(j,atrNow){
 const h=j.map(x=>+x[2]),l=j.map(x=>+x[3]),look=3,tol=Math.max(atrNow*.22,(Math.max(...h.slice(-80))-Math.min(...l.slice(-80)))*.002),pts=[];
 for(let i=look;i<j.length-look;i++){let ph=true,pl=true;for(let k=1;k<=look;k++){if(h[i]<=h[i-k]||h[i]<h[i+k])ph=false;if(l[i]>=l[i-k]||l[i]>l[i+k])pl=false}if(ph)pts.push({type:"HIGH",price:h[i],i});if(pl)pts.push({type:"LOW",price:l[i],i})}
 const groups=[];for(const p of pts.slice(-80)){let g=groups.find(x=>x.type===p.type&&Math.abs(x.price-p.price)<=tol);if(!g)groups.push(g={type:p.type,price:p.price,count:0,last:p.i});g.price=(g.price*g.count+p.price)/(g.count+1);g.count++;g.last=Math.max(g.last,p.i)}
 return groups.filter(x=>x.count>=2).sort((a,b)=>b.count-a.count||b.last-a.last).slice(0,12)
}
function fibConfluence(j,q,profile){
 const rows=j.slice(-100),hi=Math.max(...rows.map(x=>+x[2])),lo=Math.min(...rows.map(x=>+x[3])),range=hi-lo||1,levels=[.382,.5,.618,.786].map(r=>({r,price:hi-range*r})),refs=[profile?.poc,profile?.vah,profile?.val,q.sup,q.res,q.calendarVwaps?.day].filter(Number.isFinite),tol=Math.max(q.atr*.28,range*.004);
 for(const x of levels){x.hits=refs.filter(v=>Math.abs(v-x.price)<=tol).length;x.dist=Math.min(...refs.map(v=>Math.abs(v-x.price)),Infinity)}
 return levels.sort((a,b)=>b.hits-a.hits||a.dist-b.dist)
}
function renderAdvancedProfile(){
 const st=window.__radarState;if(!st){$("profileNodes").innerHTML='<div class="emptyState">Run analysis first.</div>';return}
 const j=st.j,q=st.q,p=distributedVolumeProfile(j,48,240),dev=developingPoc(j,48),ib=initialBalanceProxy(j),clusters=swingClusters(j,q.atr),fibs=fibConfluence(j,q,p),price=q.price;
 if(!p)return;
 $("advPoc").textContent=num(p.poc);$("advVa").textContent=`${num(p.vah)} / ${num(p.val)}`;$("advDevPoc").textContent=dev.length?dev.map(x=>`${x.bars}b ${num(x.poc)}`).join(" · "):"—";$("tpoPoc").textContent=num(p.tpoPoc);$("tpoSingles").textContent=p.singleCount;$("tpoIb").textContent=ib?`${num(ib.low)} / ${num(ib.high)} · ${ib.bars}b`:"—";
 const maxV=Math.max(...p.nodes.map(x=>x.value),1);$("profileNodes").innerHTML=p.nodes.length?`<div class="profileRow"><div class="profileCell">Type</div><div class="profileCell">Price</div><div class="profileCell">Relative volume</div><div class="profileCell">Distance</div><div class="profileCell">Position</div></div>`+p.nodes.map(x=>`<div class="profileRow"><div class="profileCell">${x.type}</div><div class="profileCell">${num(x.price)}</div><div class="profileCell"><div class="profileBarTrack"><div class="profileBarFill" style="width:${100*x.value/maxV}%"></div></div></div><div class="profileCell">${(100*(x.price/price-1)).toFixed(2)}%</div><div class="profileCell">${x.price>price?"ABOVE":"BELOW"}</div></div>`).join(""):'<div class="emptyState">No local profile nodes.</div>';
 const above=clusters.filter(x=>x.type==="HIGH"&&x.price>price).sort((a,b)=>a.price-b.price)[0],below=clusters.filter(x=>x.type==="LOW"&&x.price<price).sort((a,b)=>b.price-a.price)[0];
 $("liqBuyPool").textContent=above?`${num(above.price)} · ${above.count} touches`:"None";$("liqSellPool").textContent=below?`${num(below.price)} · ${below.count} touches`:"None";
 const best=fibs[0];$("fibBest").textContent=best?`${(best.r*100).toFixed(1)}% · ${num(best.price)}`:"—";$("fibStrength").textContent=best?`${best.hits} confluence hits`:"—";$("profileFvg").textContent=q.liquidity?.fvg?`${q.liquidity.fvg.type} · ${q.liquidity.fvg.status}`:"NONE";$("profilePosition").textContent=price>p.vah?"ABOVE VALUE":price<p.val?"BELOW VALUE":"IN VALUE";
 $("liqClusters").innerHTML=clusters.length?clusters.map(x=>`<span class="liqChip ${x.type==="HIGH"?"buy":"sell"}">${x.type==="HIGH"?"BUY-SIDE":"SELL-SIDE"} · ${num(x.price)} · ${x.count}×</span>`).join(""):'<span class="small">No repeated swing clusters.</span>'
}
function tradeFootprint(trades,bins=20){
 if(!trades?.length)return null;const hi=Math.max(...trades.map(x=>x.price)),lo=Math.min(...trades.map(x=>x.price)),step=(hi-lo)/bins||Math.max(hi*.0001,.00000001),rows=Array.from({length:bins},(_,i)=>({i,price:lo+(i+.5)*step,buy:0,sell:0,count:0}));
 for(const t of trades){const i=Math.max(0,Math.min(bins-1,Math.floor((t.price-lo)/step))),n=t.price*t.size;rows[i][t.side==="BUY"?"buy":"sell"]+=n;rows[i].count++}
 for(const x of rows){x.total=x.buy+x.sell;x.delta=x.buy-x.sell;x.deltaPct=x.total?x.delta/x.total*100:0}
 const poc=[...rows].sort((a,b)=>b.total-a.total)[0],imb=[...rows].sort((a,b)=>Math.abs(b.deltaPct)-Math.abs(a.deltaPct))[0],delta=rows.reduce((a,x)=>a+x.delta,0),total=rows.reduce((a,x)=>a+x.total,0);
 return {rows:rows.filter(x=>x.count),poc,imb,delta,deltaPct:total?delta/total*100:0,hi,lo,step}
}
async function loadFootprint(){
 if(assetClass()==="STOCKS"){toast("Pionex trade footprint is crypto-only.","warn");return}
 const ps=pionexSpotSymbolFromInput();try{
   if(!window.__microState||window.__microState.symbol!==ps)await loadPionexMicrostructure(true);
   const ms=window.__microState;if(!ms?.trades?.length)throw Error("No Pionex trades");
   const fp=tradeFootprint(ms.trades,20),max=Math.max(...fp.rows.map(x=>x.total),1);$("footPoc").textContent=num(fp.poc.price);$("footDelta").textContent=(fp.deltaPct>=0?"+":"")+fp.deltaPct.toFixed(1)+"%";$("footImbalance").textContent=`${fp.imb.deltaPct>=0?"+":""}${fp.imb.deltaPct.toFixed(1)}% @ ${num(fp.imb.price)}`;$("footAbsorption").textContent=ms.absorption||"NONE";$("footTrades").textContent=ms.trades.length;$("footSpan").textContent=ms.flow?Math.round(ms.flow.spanSec)+"s":"—";
   $("footprintRows").innerHTML=`<div class="footRow"><div class="footCell">Price</div><div class="footCell">Buy</div><div class="footCell">Sell</div><div class="footCell">Delta</div><div class="footCell">Activity</div></div>`+fp.rows.sort((a,b)=>b.price-a.price).map(x=>`<div class="footRow"><div class="footCell">${num(x.price)}</div><div class="footCell good">${compact(x.buy)}</div><div class="footCell bad">${compact(x.sell)}</div><div class="footCell ${x.delta>=0?"good":"bad"}">${x.deltaPct>=0?"+":""}${x.deltaPct.toFixed(1)}%</div><div class="footCell"><div class="profileBarTrack"><div class="profileBarFill" style="width:${100*x.total/max}%"></div></div></div></div>`).join("")
 }catch(e){$("footprintRows").innerHTML=`<div class="emptyState">Footprint unavailable: ${escapeHtml(e.message)}</div>`}
}

function tfMinutes(tf){return ({"1m":1,"5m":5,"15m":15,"30m":30,"1h":60,"4h":240,"1d":1440})[tf]||60}
function nyParts(ts){
  const parts=new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",year:"numeric",month:"2-digit",day:"2-digit",weekday:"short",hour:"2-digit",minute:"2-digit",hour12:false}).formatToParts(new Date(ts)),o={};
  for(const x of parts)o[x.type]=x.value;return {date:`${o.year}-${o.month}-${o.day}`,weekday:o.weekday,h:+o.hour,m:+o.minute,minutes:(+o.hour)*60+(+o.minute)}
}
function utcDayKey(ts){return new Date(ts).toISOString().slice(0,10)}
function weekKey(ts,stock=false){const d=stock?new Date(`${nyParts(ts).date}T12:00:00Z`):new Date(ts),x=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate())),day=(x.getUTCDay()+6)%7;x.setUTCDate(x.getUTCDate()-day);return x.toISOString().slice(0,10)}
function cryptoSessionForTs(ts){const d=new Date(ts),m=d.getUTCHours()*60+d.getUTCMinutes();if(m>=0&&m<480)return "ASIA";if(m>=480&&m<780)return "LONDON";if(m>=780&&m<1260)return "NEW YORK";return "OFF-WINDOW"}
function stockSessionForTs(ts){const p=nyParts(ts),m=p.minutes;if(["Sat","Sun"].includes(p.weekday))return "CLOSED";if(m>=240&&m<570)return "PRE-MARKET";if(m>=570&&m<960)return "REGULAR";if(m>=960&&m<1200)return "AFTER-HOURS";return "CLOSED"}
function sessionForTs(ts){return assetClass()==="STOCKS"?stockSessionForTs(ts):cryptoSessionForTs(ts)}
function sessionDateKey(ts){return assetClass()==="STOCKS"?nyParts(ts).date:utcDayKey(ts)}
function weightedVwapRows(rows){if(areVolLipsa(rows))return NaN;let pv=0,v=0;for(const x of rows){const tp=(+x[2]+ +x[3]+ +x[4])/3,vol=+x[5]||0;pv+=tp*vol;v+=vol}return v?pv/v:NaN}
function groupHighLow(rows){return rows?.length?{high:Math.max(...rows.map(x=>+x[2])),low:Math.min(...rows.map(x=>+x[3]))}:null}
function sessionStructureData(j,tf){
  if(!j?.length)return null;const lastTs=+j.at(-1)[0],curSession=sessionForTs(lastTs),curDate=sessionDateKey(lastTs),intraday=tf!=="1d";
  const currentRows=intraday?j.filter(x=>sessionDateKey(+x[0])===curDate&&sessionForTs(+x[0])===curSession):[],curHL=groupHighLow(currentRows),curVwap=weightedVwapRows(currentRows),openBars=Math.max(1,Math.ceil(60/tfMinutes(tf))),opening=groupHighLow(currentRows.slice(0,openBars));
  const dates=[...new Set(j.map(x=>sessionDateKey(+x[0])))],prevDate=dates.filter(x=>x<curDate).sort().at(-1),prevDay=groupHighLow(prevDate?j.filter(x=>sessionDateKey(+x[0])===prevDate):[]),curWeek=weekKey(lastTs,assetClass()==="STOCKS"),weeks=[...new Set(j.map(x=>weekKey(+x[0],assetClass()==="STOCKS")))],prevWeek=weeks.filter(x=>x<curWeek).sort().at(-1),prevWeekHL=groupHighLow(prevWeek?j.filter(x=>weekKey(+x[0],assetClass()==="STOCKS")===prevWeek):[]);
  const windows=assetClass()==="STOCKS"?["PRE-MARKET","REGULAR","AFTER-HOURS"]:["ASIA","LONDON","NEW YORK"],ladder=windows.map(name=>{const r=j.filter(x=>sessionDateKey(+x[0])===curDate&&sessionForTs(+x[0])===name),hl=groupHighLow(r);return {name,rows:r,hl,vwap:weightedVwapRows(r),active:name===curSession}});
  return {curSession,intraday,curHL,curVwap,opening,prevDay,prevWeekHL,ladder}
}
function localAtrAt(j,i,n=14){if(i<1)return 0;let s=0,c=0;for(let k=Math.max(1,i-n+1);k<=i;k++){const h=+j[k][2],l=+j[k][3],pc=+j[k-1][4];s+=Math.max(h-l,Math.abs(h-pc),Math.abs(l-pc));c++}return c?s/c:0}
function localVolAvg(j,i,n=20){if(volLipsaIn(j,i-n,i-1))return null;const a=j.slice(Math.max(0,i-n),i).map(x=>+x[5]||0);return a.length?a.reduce((x,y)=>x+y,0)/a.length:0}
function premiumDiscount(j,look=100){const r=j.slice(-look),hi=Math.max(...r.map(x=>+x[2])),lo=Math.min(...r.map(x=>+x[3])),eq=(hi+lo)/2,p=+r.at(-1)[4];return {hi,lo,eq,price:p,zone:p>eq?"PREMIUM":p<eq?"DISCOUNT":"EQUILIBRIUM",pct:(p-lo)/(hi-lo||1)*100}}

function orderBlockLifecycle(j,look=220){
  const start=Math.max(2,j.length-look),zones=[];
  for(let i=start+1;i<j.length;i++){
    const prev=j[i-1],cur=j[i],po=+prev[1],pc=+prev[4],co=+cur[1],cc=+cur[4],atr=localAtrAt(j,i),body=Math.abs(cc-co),v=volBara(cur),vavg=localVolAvg(j,i),disp=atr?body/atr:0,vr=v===null||vavg===null?null:vavg?v/vavg:1;
    // fara volum nu se poate confirma blocul (vr null) - nu se inventeaza unul
    if(disp<1.15||vr===null||vr<1.05)continue;
    if(pc<po&&cc>+prev[2])zones.push({type:"BULLISH",created:i,low:+prev[3],high:Math.max(po,pc),disp,vr,status:"UNMITIGATED",breaker:false});
    else if(pc>po&&cc<+prev[3])zones.push({type:"BEARISH",created:i,low:Math.min(po,pc),high:+prev[2],disp,vr,status:"UNMITIGATED",breaker:false});
  }
  for(const z of zones){
    let touched=false;for(let k=z.created+1;k<j.length;k++){const h=+j[k][2],l=+j[k][3],c=+j[k][4];
      if(z.type==="BULLISH"){if(c<z.low){z.status="BREAKER";z.breaker=true;z.brokenAt=k;break}if(l<=z.high){touched=true;z.status="MITIGATED";z.mitigatedAt=k}}
      else{if(c>z.high){z.status="BREAKER";z.breaker=true;z.brokenAt=k;break}if(h>=z.low){touched=true;z.status="MITIGATED";z.mitigatedAt=k}}
    }
    if(!touched&&!z.breaker)z.status="UNMITIGATED";z.mid=(z.low+z.high)/2;z.strength=clamp(z.disp*28+z.vr*18+(z.status==="UNMITIGATED"?18:0),0,100)
  }
  return zones.slice(-30)
}
function fvgLifecycleV38(j,look=220){
  const out=[],start=Math.max(2,j.length-look);for(let i=start;i<j.length;i++){const a=j[i-2],c=j[i],aHigh=+a[2],aLow=+a[3],cHigh=+c[2],cLow=+c[3];let z=null;if(cLow>aHigh)z={type:"BULLISH",low:aHigh,high:cLow,created:i};else if(cHigh<aLow)z={type:"BEARISH",low:cHigh,high:aLow,created:i};if(!z)continue;z.status="NEW";z.fill=0;
    for(let k=i+1;k<j.length;k++){const h=+j[k][2],l=+j[k][3],close=+j[k][4],size=z.high-z.low;
      if(z.type==="BULLISH"){if(close<z.low){z.status="INVALIDATED";z.fill=1;break}if(l<=z.low){z.status="MITIGATED";z.fill=1;break}if(l<z.high){z.status="PARTIAL";z.fill=Math.max(z.fill,(z.high-l)/size)}}
      else{if(close>z.high){z.status="INVALIDATED";z.fill=1;break}if(h>=z.high){z.status="MITIGATED";z.fill=1;break}if(h>z.low){z.status="PARTIAL";z.fill=Math.max(z.fill,(h-z.low)/size)}}
    }z.mid=(z.low+z.high)/2;out.push(z)
  }return out.slice(-50)
}
function latestSweepConfirmation(j){
  if(j.length<30)return null;const start=Math.max(22,j.length-16);let best=null;
  for(let i=start;i<j.length-1;i++){const prev=j.slice(i-20,i),ph=Math.max(...prev.map(x=>+x[2])),pl=Math.min(...prev.map(x=>+x[3])),x=j[i],h=+x[2],l=+x[3],c=+x[4],v=volBara(x),atr=localAtrAt(j,i),next=j[i+1],nBody=Math.abs(+next[4]-+next[1]),nDir=+next[4]>+next[1]?1:-1,vavg=localVolAvg(j,i);let type=null,dir=0,level=0;
    if(h>ph&&c<ph){type="BUY-SIDE SWEEP";dir=-1;level=ph}else if(l<pl&&c>pl){type="SELL-SIDE SWEEP";dir=1;level=pl}else continue;
    const displacement=atr?nBody/atr:0,dispOk=displacement>=.8&&nDir===dir,vr=v===null||vavg===null?null:vavg?v/vavg:1,volOk=vr!==null&&vr>=1.2,score=40+(dispOk?35:Math.min(20,displacement*20))+(volOk?25:vr===null?0:Math.min(15,vr*8));best={i,type,reclaim:true,dir,level,displacement,dispOk,volumeRatio:vr,volOk,score:clamp(score),ts:+x[0]}
  }return best
}
function executionFriction(st=window.__radarState){
  if(!st?.j?.length)return null;const cfg=appSettings(),q=st.q,rows=st.j.slice(-20),notional=areVolLipsa(rows)?null:rows.reduce((a,x)=>a+(+x[4])*(+x[5]||0),0)/Math.max(1,rows.length),atrPct=+q.atrPct||0;let liqBps=notional===null?12:notional>=100000000?1:notional>=20000000?2:notional>=5000000?4:notional>=1000000?7:12;if(st.source==="TWELVEDATA")liqBps+=1;const volBps=Math.min(15,Math.max(0,atrPct*.85)),slip=Math.max(1,liqBps+volBps),fee=+cfg.feeBps||0,round=2*(fee+slip),tier=notional===null?"NECUNOSCUT (volum lipsă)":notional>=100000000?"DEEP":notional>=20000000?"GOOD":notional>=5000000?"MEDIUM":notional>=1000000?"THIN":"VERY THIN",vol=atrPct>=6?"EXTREME":atrPct>=3?"HIGH":atrPct>=1.5?"NORMAL":"LOW",tm=window.__signalState?.tm,entry=tm?(tm.entryLow+tm.entryHigh)/2:null,risk=tm&&entry?Math.abs(entry-tm.stop)/entry:null,costR=risk?round/10000/risk:null;return {feeBps:fee,slippageBps:slip,roundTripBps:round,liquidityTier:tier,volTier:vol,notional,atrPct,costR}
}
function renderSessionStructure(){
  const st=window.__radarState;if(!st){$("sessionLadder").innerHTML='<div class="emptyState">Run analysis first.</div>';return}const d=sessionStructureData(st.j,st.tf);if(!d)return;$("sessCurrent").textContent=d.intraday?d.curSession:"DAILY TF";$("sessCurrent").className=d.intraday?"sessionActive":"sessionInactive";$("sessHighLow").textContent=d.curHL?`${num(d.curHL.high)} / ${num(d.curHL.low)}`:"Intraday only";$("sessVwap").textContent=Number.isFinite(d.curVwap)?num(d.curVwap):"Intraday only";$("sessOpening").textContent=d.opening?`${num(d.opening.high)} / ${num(d.opening.low)}`:"Intraday only";$("sessPrevDay").textContent=d.prevDay?`${num(d.prevDay.high)} / ${num(d.prevDay.low)}`:"—";$("sessPrevWeek").textContent=d.prevWeekHL?`${num(d.prevWeekHL.high)} / ${num(d.prevWeekHL.low)}`:"—";
  $("sessionLadder").innerHTML=d.ladder.map(x=>`<div class="ladderRow"><div class="ladderCell ${x.active?"sessionActive":"sessionInactive"}">${x.name}${x.active?" · ACTIVE":""}</div><div class="ladderCell">${x.hl?`${num(x.hl.low)} → ${num(x.hl.high)}`:"No bars"}</div><div class="ladderCell">${Number.isFinite(x.vwap)?"VWAP "+num(x.vwap):"—"}</div></div>`).join("");$("sessionNote").textContent=assetClass()==="STOCKS"?"US Stocks: historical candle timestamps are classified in America/New_York; REGULAR = 09:30–16:00 ET.":"Crypto research windows: Asia 00:00–08:00 UTC, London 08:00–13:00 UTC, New York 13:00–21:00 UTC."
}
function renderOrderBlocks(){
  const st=window.__radarState;if(!st)return;const zones=orderBlockLifecycle(st.j),p=st.q.price,pd=premiumDiscount(st.j),bull=[...zones].filter(x=>x.type==="BULLISH"&&!x.breaker).sort((a,b)=>Math.abs(a.mid-p)-Math.abs(b.mid-p))[0],bear=[...zones].filter(x=>x.type==="BEARISH"&&!x.breaker).sort((a,b)=>Math.abs(a.mid-p)-Math.abs(b.mid-p))[0],breakers=zones.filter(x=>x.breaker),unmit=zones.filter(x=>x.status==="UNMITIGATED");$("obBull").textContent=bull?`${num(bull.low)}–${num(bull.high)} · ${bull.status}`:"—";$("obBear").textContent=bear?`${num(bear.low)}–${num(bear.high)} · ${bear.status}`:"—";$("obBreakers").textContent=breakers.length;$("obUnmitigated").textContent=unmit.length;$("pdZone").textContent=`${pd.zone} · ${pd.pct.toFixed(0)}%`;$("structureBiasV38").textContent=st.q.structure2?.event||st.q.structure2?.trend||st.q.regime||"—";
  const shown=[...zones].sort((a,b)=>b.created-a.created).slice(0,12);$("orderBlockRows").innerHTML=shown.length?`<div class="structureRow"><div class="structureCell">Type</div><div class="structureCell">Zone</div><div class="structureCell">Status</div><div class="structureCell">Disp.</div><div class="structureCell">Vol</div><div class="structureCell">Strength</div></div>`+shown.map(x=>`<div class="structureRow"><div class="structureCell ${x.type==="BULLISH"?"zoneBull":"zoneBear"}">${x.type}</div><div class="structureCell">${num(x.low)}–${num(x.high)}</div><div class="structureCell">${x.status}</div><div class="structureCell">${x.disp.toFixed(2)} ATR</div><div class="structureCell">${(x.vr==null?"—":x.vr.toFixed(2))}×</div><div class="structureCell">${x.strength.toFixed(0)}/100</div></div>`).join(""):'<div class="emptyState">No displacement order blocks found.</div>';window.__structureV38={...(window.__structureV38||{}),orderBlocks:zones,premiumDiscount:pd}
}
function renderFvgLifecycle(){
  const st=window.__radarState;if(!st)return;const a=fvgLifecycleV38(st.j),p=st.q.price,bull=a.filter(x=>x.type==="BULLISH"&&["NEW","PARTIAL"].includes(x.status)),bear=a.filter(x=>x.type==="BEARISH"&&["NEW","PARTIAL"].includes(x.status)),mit=a.filter(x=>x.status==="MITIGATED"),part=a.filter(x=>x.status==="PARTIAL"),inv=a.filter(x=>x.status==="INVALIDATED"),active=[...bull,...bear].sort((x,y)=>Math.abs(x.mid-p)-Math.abs(y.mid-p)),near=active[0];$("fvgBullActive").textContent=bull.length;$("fvgBearActive").textContent=bear.length;$("fvgMitigated").textContent=mit.length;$("fvgPartial").textContent=part.length;$("fvgInvalid").textContent=inv.length;$("fvgNearest").textContent=near?`${near.type} · ${num(near.low)}–${num(near.high)} · ${near.status}`:"NONE";
  const shown=[...a].sort((x,y)=>y.created-x.created).slice(0,14);$("fvgRows").innerHTML=shown.length?`<div class="structureRow"><div class="structureCell">Type</div><div class="structureCell">Gap</div><div class="structureCell">Status</div><div class="structureCell">Fill</div><div class="structureCell">Distance</div><div class="structureCell">Age</div></div>`+shown.map(x=>`<div class="structureRow"><div class="structureCell ${x.type==="BULLISH"?"zoneBull":"zoneBear"}">${x.type}</div><div class="structureCell">${num(x.low)}–${num(x.high)}</div><div class="structureCell">${x.status}</div><div class="structureCell">${(100*(x.fill||0)).toFixed(0)}%</div><div class="structureCell">${(100*(x.mid/p-1)).toFixed(2)}%</div><div class="structureCell">${st.j.length-1-x.created} bars</div></div>`).join(""):'<div class="emptyState">No FVGs found.</div>';window.__structureV38={...(window.__structureV38||{}),fvgs:a,nearestFvg:near||null}
}
function renderSweepConfirmation(){const st=window.__radarState;if(!st)return;const x=latestSweepConfirmation(st.j);$("sweepType").textContent=x?.type||"NONE";$("sweepReclaim").textContent=x?"YES":"—";$("sweepDisp").textContent=x?`${x.dispOk?"YES":"NO"} · ${x.displacement.toFixed(2)} ATR`:"—";$("sweepVolume").textContent=x?(x.volumeRatio==null?"— (volum lipsă)":`${x.volOk?"YES":"NO"} · ${x.volumeRatio.toFixed(2)}×`):"—";$("sweepScore").textContent=x?x.score.toFixed(0)+"/100":"—";$("sweepImpact").textContent=x&&x.score>=75?"VALIDATE · STRONG":x&&x.score>=55?"VALIDATE · MEDIUM":"ADVISORY";window.__structureV38={...(window.__structureV38||{}),sweep:x}}
function renderExecutionFriction(){const x=executionFriction();if(!x)return;$("fricFee").textContent=x.feeBps.toFixed(1)+" bps / side";$("fricSlip").textContent=x.slippageBps.toFixed(1)+" bps / side";$("fricRound").textContent=x.roundTripBps.toFixed(1)+" bps";$("fricLiquidity").textContent=x.liquidityTier;$("fricVol").textContent=x.volTier;$("fricCostR").textContent=Number.isFinite(x.costR)?x.costR.toFixed(2)+" R":"—";window.__structureV38={...(window.__structureV38||{}),friction:x}}
function structureValidation(){
  const src=analysisSource(),r=journal().filter(x=>(x.source||"BINANCE")===src&&Number.isFinite(metricR(x))),stats=a=>{const v=a.map(metricR).filter(Number.isFinite);return {n:v.length,avg:v.length?v.reduce((x,y)=>x+y,0)/v.length:NaN}};
  const strong=stats(r.filter(x=>+x.sweepScore>=75)),weak=stats(r.filter(x=>!(+x.sweepScore>=75))),discountLong=stats(r.filter(x=>x.direction==="LONG"&&x.premiumDiscount==="DISCOUNT")),premiumShort=stats(r.filter(x=>x.direction==="SHORT"&&x.premiumDiscount==="PREMIUM"));
  return {strong,weak,discountLong,premiumShort,total:r.length}
}
function renderStructureValidation(){
  const x=structureValidation();if(!$("svSweepN"))return;$("svSweepN").textContent=x.strong.n;$("svSweepR").textContent=x.strong.n?x.strong.avg.toFixed(2)+" R":"—";$("svNoSweepR").textContent=x.weak.n?x.weak.avg.toFixed(2)+" R":"—";$("svDiscountLong").textContent=x.discountLong.n?`${x.discountLong.avg.toFixed(2)} R · ${x.discountLong.n}n`:"—";$("svPremiumShort").textContent=x.premiumShort.n?`${x.premiumShort.avg.toFixed(2)} R · ${x.premiumShort.n}n`:"—";
  let state="LEARNING",note="Need more resolved cost-aware outcomes before structure features can influence the base engine.";if(x.strong.n>=15&&x.weak.n>=15){state=x.strong.avg>x.weak.avg+.10?"UPLIFT SAMPLE":x.strong.avg<x.weak.avg-.10?"NO UPLIFT":"MIXED";note=`Strong-sweep ${x.strong.avg.toFixed(2)}R vs comparison ${x.weak.avg.toFixed(2)}R. Continue forward validation before changing signal weights.`}$("svState").textContent=state;$("svNote").textContent=note
}
function renderStructureSession(){if(!window.__radarState)return;renderSessionStructure();renderOrderBlocks();renderFvgLifecycle();renderSweepConfirmation();renderStructureValidation();renderExecutionFriction()}

let liqSocket=null,liqSeq=0,liqEvents=[],mlShadow=null,intelCache={ts:0,key:"",data:null};
let activeDecisionIdentityKey="";
function currentDecisionIdentity(symbol=null,source=null,tf=null){
  const market=assetClass(),raw=symbol??$("symbol")?.value??"",sym=market==="STOCKS"?stockSymbol(raw):norm(raw);return {market,symbol:sym,source:source||analysisSource(),tf:tf||$("tf")?.value||null,ts:Date.now()}
}
function decisionIdentityKey(x=currentDecisionIdentity()){return `${x.market}|${x.symbol}|${x.source}|${x.tf||""}`}
function stampDecisionState(obj,identity=currentDecisionIdentity()){if(obj&&typeof obj==="object")obj.__identity={...identity,ts:Date.now()};return obj}
function decisionStateMatches(obj,opt={}){
  if(!obj||typeof obj!=="object")return false;const cur=currentDecisionIdentity(),id=obj.__identity||obj,age=Date.now()-(+id.ts||+obj.updated||+obj.updatedAt||0),maxAge=opt.maxAge??10*60*1000;
  if(opt.global)return !(age>maxAge&&maxAge>0);
  if(id.market&&id.market!==cur.market)return false;if(id.symbol&&String(id.symbol)!==String(cur.symbol))return false;if(id.source&&opt.source!==false&&id.source!==cur.source)return false;if(opt.tf&&id.tf&&id.tf!==cur.tf)return false;if(maxAge>0&&age>maxAge)return false;return true
}
function invalidateDecisionContext(symbol=null,source=null,tf=null,force=false){
  const next=currentDecisionIdentity(symbol,source,tf),key=decisionIdentityKey(next);if(!force&&key===activeDecisionIdentityKey)return false;activeDecisionIdentityKey=key;
  trueFlowState=null;window.__microState=null;window.__derivativesState={};window.__intelContext=null;window.__intelNews=null;window.__volatilityIntel=null;volatilityIntelligenceState=null;window.__stockContext=null;
  externalIntelState={...(externalIntelState||{}),onchain:null,predLiq:null,options:null,histCvd:null,updatedAt:0};
  return true
}
function requestIdentityStillCurrent(identity,opt={}){const cur=currentDecisionIdentity();return identity&&identity.market===cur.market&&identity.symbol===cur.symbol&&(!opt.ignoreSource?identity.source===cur.source:true)&&(!opt.ignoreTf?identity.tf===cur.tf:true)}


let externalIntelState={config:null,calendar:null,onchain:null,predLiq:null,options:null,histCvd:null,updatedAt:0};
const externalIntelCache=new Map();

async function externalIntelApi(action,args={},force=false){
  const q=new URLSearchParams({action,...Object.fromEntries(Object.entries(args).map(([k,v])=>[k,String(v)]))}),key=q.toString(),hit=externalIntelCache.get(key);
  if(!force&&hit&&Date.now()-hit.ts<120000)return hit.data;
  const d=await getJSON("/api/external-intel?"+q.toString());externalIntelCache.set(key,{ts:Date.now(),data:d});return d
}
function extSet(id,text,cls=""){const e=$(id);if(!e)return;e.textContent=text;e.className=cls}
function extMoney(v){return Number.isFinite(+v)?compact(+v):"—"}
function extPct(v,d=1){return Number.isFinite(+v)?((+v)>=0?"+":"")+(+v).toFixed(d)+"%":"—"}
function extMinsText(m){
  if(!Number.isFinite(m))return "—";if(m<0)return `${Math.abs(Math.round(m))}m ago`;if(m<60)return `${Math.round(m)}m`;if(m<1440)return `${(m/60).toFixed(1)}h`;return `${(m/1440).toFixed(1)}d`
}
async function loadExternalIntelConfig(force=false){
  try{const d=await externalIntelApi("config",{},force);externalIntelState.config=d;return d}catch(e){externalIntelState.config={error:e.message};return externalIntelState.config}
}
function summarizeEconomicCalendar(d){
  if(!d?.available)return {available:false,risk:d?.configured===false?"CONFIGURE":"UNAVAILABLE",high:0,next:null,mins:NaN};
  const now=Date.now(),items=d.items||[],high=items.filter(x=>x.importance>=3),recentHigh=high.filter(x=>Math.abs(x.ts-now)<=30*60000).sort((a,b)=>Math.abs(a.ts-now)-Math.abs(b.ts-now))[0],future=high.filter(x=>x.ts>now).sort((a,b)=>a.ts-b.ts),next=recentHigh||future[0]||null,mins=next?(next.ts-now)/60000:NaN;
  let risk="NORMAL";if(recentHigh)risk="BLACKOUT";else if(Number.isFinite(mins)&&mins<=30)risk="BLACKOUT";else if(Number.isFinite(mins)&&mins<=120)risk="HIGH";else if(Number.isFinite(mins)&&mins<=360)risk="ELEVATED";
  return {available:true,risk,high:high.length,next,mins}
}
async function loadEconomicCalendar(force=false){
  try{
    const d=await externalIntelApi("calendar",{days:7,importance:2,country:"united states"},force),z=summarizeEconomicCalendar(d);externalIntelState.calendar={...d,summary:z};
    extSet("econProvider",d.available?d.provider:(d.configured===false?"CONFIGURE KEY":"UNAVAILABLE"),d.available?"extGood":"extWarn");extSet("econRisk",z.risk,z.risk==="BLACKOUT"?"extBad":z.risk==="HIGH"||z.risk==="ELEVATED"?"extWarn":"extGood");extSet("econNext",z.next?.event||"—");extSet("econCountdown",extMinsText(z.mins));extSet("econHighCount",String(z.high));extSet("econCoverage",d.available?`${d.start} → ${d.end}`:"NO LIVE CALENDAR");
    $("econTable").innerHTML=d.available&&d.items?.length?`<div class="extRow"><div class="extCell">Event</div><div class="extCell">Time</div><div class="extCell">Impact</div><div class="extCell">Actual</div><div class="extCell">Forecast</div><div class="extCell">Previous</div></div>`+d.items.slice(0,30).map(x=>`<div class="extRow"><div class="extCell">${escapeHtml(x.event)}</div><div class="extCell">${new Date(x.ts).toLocaleString()}</div><div class="extCell ${x.importance>=3?"extBad":x.importance===2?"extWarn":""}">${"●".repeat(Math.max(1,x.importance))}</div><div class="extCell">${escapeHtml(x.actual||"—")}</div><div class="extCell">${escapeHtml(x.forecast||"—")}</div><div class="extCell">${escapeHtml(x.previous||"—")}</div></div>`).join(""):`<div class="emptyState">${escapeHtml(d.error||"Configure TRADING_ECONOMICS_API_KEY to load real economic events.")}</div>`;
    archiveExternalIntel("calendar",externalIntelState.calendar).catch(()=>{});renderMasterVerdict();return externalIntelState.calendar
  }catch(e){externalIntelState.calendar={available:false,error:e.message,summary:{risk:"UNAVAILABLE"}};$("econTable").innerHTML=`<div class="emptyState">${escapeHtml(e.message)}</div>`;renderMasterVerdict();return null}
}
function onchainScore(d){
  const n=d?.network;if(!n?.available)return null;const c=n.change7d||{},adr=Number(c.AdrActCnt),tx=Number(c.TxCnt);let score=50,w=0;
  if(Number.isFinite(adr)){score+=clamp(adr,-25,25)*.7;w++}if(Number.isFinite(tx)){score+=clamp(tx,-25,25)*.5;w++}
  const net=Number(d.whales?.netExchangeFlowUsd),tot=Number(d.whales?.totalUsd);if(Number.isFinite(net)&&Number.isFinite(tot)&&tot>0){score-=clamp(net/tot*100,-20,20)*.6;w++}
  return w?clamp(score,0,100):50
}
async function loadOnchainIntel(force=false){
  const symbol=coin(norm($("symbol").value)),req=currentDecisionIdentity(norm($("symbol").value));
  try{
    const d=await externalIntelApi("onchain",{symbol,days:35,hours:24,minUsd:1000000},force);if(!requestIdentityStillCurrent(req,{ignoreTf:true}))return null;d.contextScore=onchainScore(d);externalIntelState.onchain=stampDecisionState(d,req);
    const n=d.network||{},l=n.latest||{},c=n.change7d||{},w=d.whales||{},score=d.contextScore,state=Number.isFinite(score)?score>=60?"EXPANDING / OUTFLOW":score<=40?"CONTRACTING / INFLOW":"NEUTRAL":"N/A";
    extSet("onchainProvider",n.available?n.provider:"UNAVAILABLE",n.available?"extGood":"extWarn");extSet("onchainState",state,score>=60?"extGood":score<=40?"extBad":"extWarn");extSet("onchainAdr",extPct(c.AdrActCnt));extSet("onchainTx",extPct(c.TxCnt));extSet("onchainMvrv",Number.isFinite(+l.CapMVRVCur)?`${(+l.CapMVRVCur).toFixed(2)} · ${extMoney(l.CapRealUSD)}`:(Number.isFinite(+l.CapRealUSD)?extMoney(l.CapRealUSD):"N/A"));
    extSet("whaleProvider",w.available?w.provider:(w.configured===false?"CONFIGURE KEY":"UNAVAILABLE"),w.available?"extGood":"extWarn");extSet("whaleInflow",w.available?extMoney(w.inflowUsd):"—");extSet("whaleOutflow",w.available?extMoney(w.outflowUsd):"—");extSet("whaleNet",w.available?`${(+w.netExchangeFlowUsd)>=0?"+":""}${extMoney(w.netExchangeFlowUsd)}`:"—",w.available?(w.netExchangeFlowUsd>0?"extBad":w.netExchangeFlowUsd<0?"extGood":""):"");extSet("whaleCount",w.available?String(w.items?.length||0):"—");extSet("onchainContext",Number.isFinite(score)?score.toFixed(0)+"/100":"N/A");extSet("onchainCoverage",`${n.metrics?.length||0} network metrics · ${w.available?"attributed flows":"network only"}`);
    $("whaleTable").innerHTML=w.available&&w.items?.length?`<div class="extRow"><div class="extCell">Time</div><div class="extCell">Flow</div><div class="extCell">USD</div><div class="extCell">Height</div><div class="extCell">Type</div><div class="extCell">Hash</div></div>`+w.items.slice(0,20).map(x=>`<div class="extRow"><div class="extCell">${new Date(x.ts).toLocaleString()}</div><div class="extCell ${x.flow==="EXCHANGE_INFLOW"?"extBad":x.flow==="EXCHANGE_OUTFLOW"?"extGood":""}">${x.flow}</div><div class="extCell">${extMoney(x.valueUsd)}</div><div class="extCell">${x.height||"—"}</div><div class="extCell">${escapeHtml(x.transactionType||"TRANSFER")}</div><div class="extCell">${escapeHtml(String(x.hash||"").slice(0,18))}</div></div>`).join(""):`<div class="emptyState">${escapeHtml(w.error||"Coin Metrics network metrics loaded. Configure WHALE_ALERT_API_KEY for attributed whale/exchange flows.")}</div>`;
    archiveExternalIntel("onchain",d).catch(()=>{});renderMasterVerdict();return d
  }catch(e){if(!requestIdentityStillCurrent(req,{ignoreTf:true}))return null;externalIntelState.onchain=stampDecisionState({available:false,error:e.message},req);$("whaleTable").innerHTML=`<div class="emptyState">${escapeHtml(e.message)}</div>`;renderMasterVerdict();return null}
}
function predictiveLiqSummary(d){
  if(!d?.available||!d.yAxis?.length)return {available:false};
  const current=Number(window.__radarState?.q?.price)||Number(d.priceCandlesticks?.at(-1)?.[4]),m=new Map();for(const c of d.cells||[]){const price=Number(d.yAxis[c.y]);if(!Number.isFinite(price))continue;m.set(price,(m.get(price)||0)+Number(c.value||0))}
  const levels=[...m.entries()].map(([price,value])=>({price,value})).sort((a,b)=>b.value-a.value),above=levels.filter(x=>x.price>current).reduce((a,x)=>a+x.value,0),below=levels.filter(x=>x.price<current).reduce((a,x)=>a+x.value,0),total=above+below,peak=levels[0]||null,state=above>below*1.25?"UPSIDE LIQUIDITY DENSITY":below>above*1.25?"DOWNSIDE LIQUIDITY DENSITY":"BALANCED";
  return {available:true,current,levels,above,below,total,peak,state,imbalance:total?(above-below)/total:0}
}
async function loadPredictiveLiquidationMap(force=false){
  const symbol=norm($("symbol").value),req=currentDecisionIdentity(symbol);
  try{
    const d=await externalIntelApi("liquidation_map",{symbol,range:"3d"},force);if(!requestIdentityStillCurrent(req,{ignoreTf:true}))return null;const z=predictiveLiqSummary(d);externalIntelState.predLiq=stampDecisionState({...d,summary:z},req);
    extSet("predLiqProvider",d.available?d.provider:(d.configured===false?"CONFIGURE KEY":"UNAVAILABLE"),d.available?"extGood":"extWarn");extSet("predLiqModel",d.available?`${d.model} · ${d.range}`:"—");extSet("predLiqPeak",z.peak?`${num(z.peak.price)} · ${extMoney(z.peak.value)}`:"—");extSet("predLiqAbove",z.available?extMoney(z.above):"—");extSet("predLiqBelow",z.available?extMoney(z.below):"—");extSet("predLiqState",z.state||"N/A",z.state==="BALANCED"?"extWarn":z.available?"extGood":"extWarn");
    const max=z.levels?.[0]?.value||1;$("predLiqLevels").innerHTML=z.available?`<div class="extRow"><div class="extCell">Price</div><div class="extCell">Intensity</div><div class="extCell">vs current</div><div class="extCell">Distance</div><div class="extCell">Share of peak</div><div class="extCell">Model</div></div>`+z.levels.slice(0,15).map(x=>`<div class="extRow"><div class="extCell">${num(x.price)}</div><div class="extCell">${extMoney(x.value)}</div><div class="extCell">${x.price>=z.current?"ABOVE":"BELOW"}</div><div class="extCell">${z.current?(((x.price/z.current)-1)*100).toFixed(2)+"%":"—"}</div><div class="extCell"><div class="heatTrack"><i style="width:${Math.min(100,x.value/max*100)}%"></i></div></div><div class="extCell">MODEL2</div></div>`).join(""):`<div class="emptyState">${escapeHtml(d.error||"Configure COINGLASS_API_KEY with a plan that includes liquidation heatmaps.")}</div>`;
    archiveExternalIntel("predictive_liquidation",externalIntelState.predLiq).catch(()=>{});renderMasterVerdict();return externalIntelState.predLiq
  }catch(e){if(!requestIdentityStillCurrent(req,{ignoreTf:true}))return null;externalIntelState.predLiq=stampDecisionState({available:false,error:e.message},req);$("predLiqLevels").innerHTML=`<div class="emptyState">${escapeHtml(e.message)}</div>`;renderMasterVerdict();return null}
}
function optionsContext(d){
  if(!d?.available)return {state:"N/A",score:null};const t=d.termStructure?.[0]||{},pcr=Number(d.putCallOiRatio),skew=Number(t.skewProxy);let score=50;
  if(Number.isFinite(pcr))score+=clamp((1-pcr)*18,-18,18);if(Number.isFinite(skew))score-=clamp(skew*1.2,-15,15);
  const state=score>=60?"UPSIDE / CALL BIAS":score<=40?"DOWNSIDE HEDGE DEMAND":"BALANCED";return {state,score:clamp(score)}
}
async function loadOptionsIntel(force=false){
  const symbol=coin(norm($("symbol").value)),req=currentDecisionIdentity(norm($("symbol").value));
  try{
    const d=await externalIntelApi("options",{symbol},force);if(!requestIdentityStillCurrent(req,{ignoreTf:true}))return null;const ctx=optionsContext(d);d.context=ctx;externalIntelState.options=stampDecisionState(d,req);const t=d.termStructure?.[0]||{};
    extSet("optUnderlying",d.available?`${d.currency} ${num(d.underlying)}`:"N/A");extSet("optPcr",d.available&&Number.isFinite(+d.putCallOiRatio)?(+d.putCallOiRatio).toFixed(2):"—");extSet("optAtmIv",Number.isFinite(+t.atmIv)?(+t.atmIv).toFixed(1)+"%":"—");extSet("optSkew",Number.isFinite(+t.skewProxy)?((+t.skewProxy)>=0?"+":"")+(+t.skewProxy).toFixed(1)+" vol":"—");extSet("optMaxPain",Number.isFinite(+d.maxPainProxy)?num(d.maxPainProxy):"—");extSet("optContext",ctx.state,ctx.score>=60?"extGood":ctx.score<=40?"extBad":"extWarn");
    $("optTermTable").innerHTML=d.available&&d.termStructure?.length?`<div class="extRow"><div class="extCell">Expiry</div><div class="extCell">Days</div><div class="extCell">ATM IV</div><div class="extCell">Put wing IV</div><div class="extCell">Call wing IV</div><div class="extCell">Skew proxy</div></div>`+d.termStructure.slice(0,10).map(x=>`<div class="extRow"><div class="extCell">${new Date(x.expiry).toLocaleDateString()}</div><div class="extCell">${x.days.toFixed(1)}</div><div class="extCell">${Number.isFinite(+x.atmIv)?(+x.atmIv).toFixed(1)+"%":"—"}</div><div class="extCell">${Number.isFinite(+x.putWingIv)?(+x.putWingIv).toFixed(1)+"%":"—"}</div><div class="extCell">${Number.isFinite(+x.callWingIv)?(+x.callWingIv).toFixed(1)+"%":"—"}</div><div class="extCell">${Number.isFinite(+x.skewProxy)?(+x.skewProxy).toFixed(1):"—"}</div></div>`).join(""):`<div class="emptyState">${escapeHtml(d.error||"No Deribit options returned for this asset.")}</div>`;
    archiveExternalIntel("options",d).catch(()=>{});if(window.__radarState)renderVolatilityIntelligence(false);renderMasterVerdict();return d
  }catch(e){if(!requestIdentityStillCurrent(req,{ignoreTf:true}))return null;externalIntelState.options=stampDecisionState({available:false,error:e.message},req);$("optTermTable").innerHTML=`<div class="emptyState">${escapeHtml(e.message)}</div>`;renderMasterVerdict();return null}
}
function historicalCvdSummary(d){
  if(!d?.available||!d.rows?.length)return {available:false,state:"N/A",deltaPct:NaN};const buy=Number(d.totalBuyUsd)||0,sell=Number(d.totalSellUsd)||0,total=buy+sell,deltaPct=total?(buy-sell)/total*100:0,state=deltaPct>=3?"HIST BUY DOMINANT":deltaPct<=-3?"HIST SELL DOMINANT":"HIST BALANCED";return {available:true,buy,sell,deltaPct,state}
}
async function loadHistoricalCvd(force=false){
  const symbol=norm($("symbol").value),days=+$("histCvdDays")?.value||7,req=currentDecisionIdentity(symbol);
  try{
    const d=await externalIntelApi("cvd",{symbol,days,interval:"1h"},force);if(!requestIdentityStillCurrent(req,{ignoreTf:true}))return null;const z=historicalCvdSummary(d);d.summary=z;externalIntelState.histCvd=stampDecisionState(d,req);
    extSet("histCvdProvider",d.available?d.provider:(d.configured===false?"CONFIGURE KEY":"UNAVAILABLE"),d.available?"extGood":"extWarn");extSet("histCvdInterval",d.interval||"—");extSet("histCvdCoverage",Number.isFinite(+d.coverage)?`${(+d.coverage*100).toFixed(0)}% · ${d.windowState}`:"—",d.windowState==="COMPLETE_WINDOW"?"extGood":"extWarn");extSet("histCvdValue",d.available?`${(+d.finalCvd)>=0?"+":""}${extMoney(d.finalCvd)}`:"—");extSet("histCvdBuySell",d.available?`${extMoney(d.totalBuyUsd)} / ${extMoney(d.totalSellUsd)}`:"—");extSet("histCvdState",z.state,z.deltaPct>=3?"extGood":z.deltaPct<=-3?"extBad":"extWarn");
    $("histCvdTable").innerHTML=d.available&&d.rows?.length?`<div class="extRow"><div class="extCell">Time</div><div class="extCell">Taker buy</div><div class="extCell">Taker sell</div><div class="extCell">Delta</div><div class="extCell">CVD</div><div class="extCell">Interval</div></div>`+d.rows.slice(-18).reverse().map(x=>`<div class="extRow"><div class="extCell">${new Date(x.ts).toLocaleString()}</div><div class="extCell">${extMoney(x.buy)}</div><div class="extCell">${extMoney(x.sell)}</div><div class="extCell ${x.delta>=0?"extGood":"extBad"}">${x.delta>=0?"+":""}${extMoney(x.delta)}</div><div class="extCell">${x.cvd>=0?"+":""}${extMoney(x.cvd)}</div><div class="extCell">${d.interval}</div></div>`).join(""):`<div class="emptyState">${escapeHtml(d.error||"Configure COINGLASS_API_KEY for historical taker buy/sell data.")}</div>`;
    archiveExternalIntel("historical_cvd",d).catch(()=>{});renderMasterVerdict();return d
  }catch(e){if(!requestIdentityStillCurrent(req,{ignoreTf:true}))return null;externalIntelState.histCvd=stampDecisionState({available:false,error:e.message},req);$("histCvdTable").innerHTML=`<div class="emptyState">${escapeHtml(e.message)}</div>`;renderMasterVerdict();return null}
}
async function archiveExternalIntel(type,data){
  if(!data)return false;const ts=Date.now(),symbol=assetClass()==="CRYPTO"?norm($("symbol").value):stockSymbol($("symbol").value),small=JSON.parse(JSON.stringify(data,(k,v)=>Array.isArray(v)&&v.length>120?v.slice(-120):v));return localDbPutRecord("external_intel",`${ts}|${type}|${symbol}`,{ts,type,symbol,market:assetClass(),data:small},ts)
}
async function loadExternalIntelligence(force=false){
  await loadExternalIntelConfig(force);
  if(assetClass()!=="CRYPTO"){await loadEconomicCalendar(force);return externalIntelState}
  const results=await Promise.allSettled([loadEconomicCalendar(force),loadOnchainIntel(force),loadPredictiveLiquidationMap(force),loadOptionsIntel(force),loadHistoricalCvd(force)]);
  externalIntelState.updatedAt=Date.now();renderMasterVerdict();return {state:externalIntelState,results}
}
async function intelApi(action,args={}){
  const q=new URLSearchParams({action,...Object.fromEntries(Object.entries(args).map(([k,v])=>[k,String(v)]))});
  return getJSON("/api/intel?"+q.toString())
}
function pctSafe(v,d=2){return Number.isFinite(+v)?((+v)>=0?"+":"")+(+v).toFixed(d)+"%":"—"}
function compactBytes(v){
  v=+v||0;if(v>=1e9)return (v/1e9).toFixed(1)+" GB";if(v>=1e6)return (v/1e6).toFixed(1)+" MB";if(v>=1e3)return (v/1e3).toFixed(1)+" kB";return String(Math.round(v))+" B"
}
function contextScoreFrom(global,macro){
  const cg=global?.marketCapChange24h,vg=global?.volumeChange24h,m=macro?.riskOnScore;
  let parts=[];if(Number.isFinite(+m))parts.push({w:.55,v:+m});if(Number.isFinite(+cg))parts.push({w:.30,v:clamp(50+(+cg)*5)});if(Number.isFinite(+vg))parts.push({w:.15,v:clamp(50+(+vg)*2)});
  if(!parts.length)return null;const sw=parts.reduce((a,x)=>a+x.w,0);return parts.reduce((a,x)=>a+x.v*x.w,0)/sw
}
function macroPairText(m,a,b){
  const x=m?.metrics?.[a],y=m?.metrics?.[b];if(!x&&!y)return "—";
  return `${a} ${pctSafe(x?.r20,1)} · ${b} ${pctSafe(y?.r20,1)}`
}
async function loadContextIntel(force=false){
  const req=currentDecisionIdentity(),key=req.market+":"+req.symbol,now=Date.now();
  if(!force&&intelCache.key===key&&now-intelCache.ts<60000&&intelCache.data){renderContextIntel(intelCache.data);return intelCache.data}
  const tasks=[intelApi("macro").catch(e=>({configured:false,error:e.message}))];
  if(assetClass()==="CRYPTO")tasks.push(intelApi("crypto_global").catch(e=>({error:e.message})),intelApi("btc_network").catch(e=>({error:e.message})));
  const r=await Promise.all(tasks),data=req.market==="CRYPTO"?{macro:r[0],global:r[1],btc:r[2]}:{macro:r[0],global:null,btc:null};
  if(!requestIdentityStillCurrent(req,{ignoreTf:true}))return null;stampDecisionState(data,req);intelCache={ts:now,key,data};window.__intelContext=data;renderContextIntel(data);return data
}
function renderContextIntel(d){
  const score=contextScoreFrom(d.global,d.macro);$("intelScore").textContent=Number.isFinite(score)?score.toFixed(0)+"/100":"—";$("intelScore").className="contextScore "+(score>=60?"good":score<=40?"bad":"neutral");
  $("intelBtcDom").textContent=Number.isFinite(+d.global?.btcDominance)?(+d.global.btcDominance).toFixed(2)+"%":"N/A";
  $("intelMcap24").textContent=pctSafe(d.global?.marketCapChange24h);$("intelVol24").textContent=pctSafe(d.global?.volumeChange24h);
  $("intelEquity").textContent=macroPairText(d.macro,"QQQ","SPY");$("intelDefensive").textContent=macroPairText(d.macro,"TLT","GLD");
  const m=d.macro?.configured?`Macro risk-on ${Number(d.macro.riskOnScore).toFixed(0)}/100`:"Macro provider unavailable";
  $("intelContextNote").textContent=`${m}. Context remains advisory and does not alter base signal weights in v39.`;
  const b=d.btc;if(assetClass()==="CRYPTO"&&b&&!b.error){
    $("btcMempoolTx").textContent=Number.isFinite(+b.mempool?.count)?Number(b.mempool.count).toLocaleString():"—";$("btcMempoolVsize").textContent=Number.isFinite(+b.mempool?.vsize)?compactBytes(+b.mempool.vsize):"—";
    $("btcFastFee").textContent=Number.isFinite(+b.fees?.fastestFee)?`${b.fees.fastestFee} sat/vB`:"—";$("btcEcoFee").textContent=Number.isFinite(+b.fees?.economyFee)?`${b.fees.economyFee} sat/vB`:"—";
    $("btcHashrate").textContent=Number.isFinite(+b.hashrate)?compact(+b.hashrate)+" H/s":"—";$("btcDifficulty").textContent=Number.isFinite(+b.difficulty?.difficultyChange)?pctSafe(b.difficulty.difficultyChange):"—"
  }
}
function eventHeadlineClass(title){
  const t=String(title||"").toLowerCase(),high=["hack","exploit","breach","lawsuit","investigation","bankruptcy","delist","ban","attack","outage","emergency","fraud","liquidat"],neg=["downgrade","misses","missed","cuts guidance","probe","fine","selloff","decline","warning","risk","sec charges","rejected"],pos=["approval","approved","partnership","launch","upgrade","record","beats","beat estimates","raises guidance","buyback","acquisition","contract","inflow","adoption"];
  const h=high.filter(x=>t.includes(x)).length,n=neg.filter(x=>t.includes(x)).length,p=pos.filter(x=>t.includes(x)).length;
  return {high:h>0,negative:n+h>0,positive:p>0&&!h,score:h?3:n?2:p?0:1}
}
async function loadIntelNews(force=false){
  const market=assetClass(),symbol=market==="STOCKS"?stockSymbol($("symbol").value):coin(norm($("symbol").value)),req=currentDecisionIdentity(market==="STOCKS"?symbol:norm($("symbol").value));$("newsList").innerHTML='<div class="emptyState">Loading event feed…</div>';
  try{
    const d=await intelApi("news",{market,symbol}),items=(d.items||[]).map(x=>({...x,class:eventHeadlineClass(x.title)})),high=items.filter(x=>x.class.high).length,neg=items.filter(x=>x.class.negative).length,pos=items.filter(x=>x.class.positive).length,risk=high?"HIGH":neg>=3?"ELEVATED":neg?"MEDIUM":"LOW";
    $("newsRisk").textContent=risk;$("newsRisk").className="newsRisk "+(risk==="HIGH"?"riskHigh":risk==="ELEVATED"||risk==="MEDIUM"?"riskMed":"riskLow");$("newsHigh").textContent=high;$("newsPositive").textContent=pos;$("newsNegative").textContent=neg;$("newsCount").textContent=items.length;$("newsSource").textContent=d.source||"—";
    $("newsList").innerHTML=items.length?items.map(x=>`<div class="newsItem"><b>${escapeHtml(x.title)}</b><span>${escapeHtml(x.datetime||"Time N/A")} · ${escapeHtml(x.domain||x.source||"")} · ${x.class.high?"HIGH EVENT RISK":x.class.negative?"NEGATIVE CATALYST":x.class.positive?"POSITIVE CATALYST":"NEUTRAL/UNCLEAR"}</span></div>`).join(""):'<div class="emptyState">No recent items returned.</div>';
    if(!requestIdentityStillCurrent(req,{ignoreTf:true}))return null;window.__intelNews=stampDecisionState({market,symbol,source:d.source,items,risk,high,neg,pos,ts:Date.now()},req)
  }catch(e){$("newsList").innerHTML=`<div class="emptyState">News unavailable: ${escapeHtml(e.message)}</div>`;$("newsRisk").textContent="N/A"}
}
function escapeHtml(x){return String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function safeUiToken(x,max=48){return String(x??"").replace(/[^A-Za-z0-9._:\-/ ]/g,"").slice(0,max)}
function safeActionToken(x,max=32){return String(x??"").replace(/[^A-Za-z0-9._-]/g,"").slice(0,max)}

function liqSelectedSymbol(){return norm($("symbol").value)}
function normalizeLiqEvent(raw){
  const x=raw?.data||raw,o=x?.o||x?.order||null;if(!o)return null;
  const symbol=String(o.s||"").toUpperCase(),side=String(o.S||"").toUpperCase(),price=+(o.ap||o.p||0),qty=+(o.z||o.q||0),ts=+(x.E||o.T||Date.now()),notional=price*qty;
  if(!symbol||!notional)return null;return {symbol,side,price,qty,notional,ts,liquidated:side==="SELL"?"LONG":"SHORT"}
}
function pruneLiq(){const cut=Date.now()-7*86400000;liqEvents=liqEvents.filter(x=>x.ts>=cut).sort((a,b)=>a.ts-b.ts).slice(-20000)}
function liqStats(){
  pruneLiq();const sym=liqSelectedSymbol(),sel=liqEvents.filter(x=>x.symbol===sym),now=Date.now(),f5=sel.filter(x=>x.ts>=now-5*60*1000),f15=sel.filter(x=>x.ts>=now-15*60*1000),sum=(a,side=null)=>a.filter(x=>!side||x.liquidated===side).reduce((z,x)=>z+x.notional,0);
  return {sym,sel,long5:sum(f5,"LONG"),short5:sum(f5,"SHORT"),total15:sum(f15),f15}
}
function renderLiquidationTape(){
  const z=liqStats(),dom=z.long5>z.short5*1.2?"LONGS":z.short5>z.long5*1.2?"SHORTS":"BALANCED";$("liqLong5").textContent=compact(z.long5);$("liqShort5").textContent=compact(z.short5);$("liqTotal15").textContent=compact(z.total15);$("liqDominant").textContent=dom;$("liqSelectedN").textContent=z.sel.length;
  const rows=(z.sel.length?z.sel:liqEvents).slice(-30).reverse();$("liqTape").innerHTML=rows.length?`<div class="liqRow"><div class="liqCell">Time</div><div class="liqCell">Symbol</div><div class="liqCell">Side liquidated</div><div class="liqCell">Price</div><div class="liqCell">Notional</div></div>`+rows.map(x=>`<div class="liqRow"><div class="liqCell">${new Date(x.ts).toLocaleTimeString()}</div><div class="liqCell">${escapeHtml(x.symbol)}</div><div class="liqCell ${x.liquidated==="LONG"?"bad":"good"}">${x.liquidated}</div><div class="liqCell">${num(x.price)}</div><div class="liqCell">${compact(x.notional)}</div></div>`).join(""):'<div class="emptyState">Waiting for liquidation events…</div>';
}
function stopLiquidationTape(){
  liqSeq++;if(liqSocket){try{liqSocket.close()}catch{}liqSocket=null}$("liqWsStatus").textContent="OFF";if($("healthLiquidation"))$("healthLiquidation").textContent="OFF"
}
function startLiquidationTape(){
  if(assetClass()!=="CRYPTO"){toast("Liquidation tape is crypto-only.","warn");return}
  stopLiquidationTape();const seq=++liqSeq;$("liqWsStatus").textContent="CONNECTING";
  try{
    const ws=new WebSocket("wss://fstream.binance.com/ws/!forceOrder@arr");liqSocket=ws;
    ws.onopen=()=>{if(seq!==liqSeq)return;$("liqWsStatus").textContent="LIVE";if($("healthLiquidation"))$("healthLiquidation").textContent="LIVE"};
    ws.onmessage=e=>{if(seq!==liqSeq)return;try{const d=JSON.parse(e.data),arr=Array.isArray(d)?d:[d];for(const x of arr){const q=normalizeLiqEvent(x);if(q)liqEvents.push(q)}pruneLiq();persistObservedLiquidations();renderLiquidationTape();renderObservedLiquidationHeatmap()}catch{}};
    ws.onerror=()=>{if(seq!==liqSeq)return;$("liqWsStatus").textContent="ERROR";if($("healthLiquidation"))$("healthLiquidation").textContent="ERROR"};
    ws.onclose=()=>{if(seq!==liqSeq)return;$("liqWsStatus").textContent="CLOSED";if($("healthLiquidation"))$("healthLiquidation").textContent="CLOSED"}
  }catch(e){$("liqWsStatus").textContent="UNAVAILABLE"}
}

const ML_FEATURES=["confidence","trend","momentum","volume","structure","adx","hist","mtf","mfi","cmf","micro","sweep","friction"];
function mlAligned(v,dir){const x=v!=null&&v!==""&&Number.isFinite(+v)?+v:50;return clamp(dir>0?x:100-x)/100}
function mlFeatureRow(x){
  const dir=x.direction==="SHORT"?-1:1,conf=Math.max(+x.longConf||0,+x.shortConf||0)/100,cmf=x.cmf!=null&&Number.isFinite(+x.cmf)?clamp(.5+dir*(+x.cmf)/2,0,1):.5,micro=Number.isFinite(+x.microScore)?clamp(.5+dir*(+x.microScore)/200,0,1):.5;
  let sweep=.5;if(Number.isFinite(+x.sweepScore)&&x.sweepType){const aligned=(dir>0&&String(x.sweepType).startsWith("SELL-SIDE"))||(dir<0&&String(x.sweepType).startsWith("BUY-SIDE"));sweep=clamp(.5+(aligned?1:-1)*(+x.sweepScore)/200,0,1)}
  const friction=Number.isFinite(+x.frictionBps)?clamp(1-(+x.frictionBps)/120,0,1):.5;
  const vals=[conf,mlAligned(x.trendScore,dir),mlAligned(x.momScore,dir),mlAligned(x.volScore,dir),mlAligned(x.structureScore,dir),clamp((+x.adx||20)/50,0,1),mlAligned(x.histUp,dir),mlAligned(x.mtf,dir),mlAligned(x.mfi,dir),cmf,micro,sweep,friction];
  const utility=Number.isFinite(metricR(x))?clamp(metricR(x),-3,3):0,label=utility>=.10?1:0,weight=clamp(Math.abs(utility),.25,3);
  return {vals,label,utility,weight,row:x}
}
function mlDataset(){
  return resolvedChronological(analysisSource()).filter(x=>x.direction==="LONG"||x.direction==="SHORT").map(mlFeatureRow).filter(x=>x.vals.every(Number.isFinite))
}
function mlSigmoid(z){return z>=0?1/(1+Math.exp(-z)):Math.exp(z)/(1+Math.exp(z))}
function normalizeTrain(train){
  const p=train[0].vals.length,mean=Array(p).fill(0),sd=Array(p).fill(0),sw=train.reduce((a,r)=>a+mlSampleWeight(r),0)||train.length;for(const r of train){const wt=mlSampleWeight(r);for(let j=0;j<p;j++)mean[j]+=r.vals[j]*wt/sw}
  for(const r of train){const wt=mlSampleWeight(r);for(let j=0;j<p;j++)sd[j]+=(r.vals[j]-mean[j])**2*wt/sw}for(let j=0;j<p;j++)sd[j]=Math.sqrt(sd[j])||1;
  return {mean,sd,norm:v=>v.map((x,j)=>(x-mean[j])/sd[j])}
}
function trainLogistic(train,l2=.02,epochs=420,lr=.08){
  const n=train.length,p=train[0].vals.length,scale=normalizeTrain(train),w=Array(p+1).fill(0),sw=train.reduce((a,r)=>a+mlSampleWeight(r),0)||n;
  for(let ep=0;ep<epochs;ep++){const g=Array(p+1).fill(0);for(const r of train){const wt=mlSampleWeight(r),x=scale.norm(r.vals),z=w[0]+x.reduce((a,v,j)=>a+v*w[j+1],0),pr=mlSigmoid(z),e=(pr-r.label)*wt;g[0]+=e;for(let j=0;j<p;j++)g[j+1]+=e*x[j]}for(let j=0;j<w.length;j++){const reg=j?l2*w[j]:0;w[j]-=lr*(g[j]/sw+reg)}}
  const baseRate=train.reduce((a,x)=>a+x.label*mlSampleWeight(x),0)/sw;return {w,...scale,baseRate,predict(vals){const x=this.norm(vals),z=this.w[0]+x.reduce((a,v,j)=>a+v*this.w[j+1],0);return mlSigmoid(z)},contrib(vals){const x=this.norm(vals);return x.map((v,j)=>v*this.w[j+1])}}
}
function aucMetric(pred){
  const pos=pred.filter(x=>x.y===1),neg=pred.filter(x=>x.y===0);if(!pos.length||!neg.length)return NaN;let wins=0,ties=0;for(const p of pos)for(const n of neg){if(p.p>n.p)wins++;else if(p.p===n.p)ties++}return (wins+.5*ties)/(pos.length*neg.length)
}
function wilsonInterval(w,n,z=1.96){
  if(!n)return [NaN,NaN];const p=w/n,d=1+z*z/n,c=(p+z*z/(2*n))/d,m=z*Math.sqrt((p*(1-p)+z*z/(4*n))/n)/d;return [Math.max(0,c-m),Math.min(1,c+m)]
}
function currentMlFeatureRow(){
  const st=window.__radarState,ss=window.__signalState;if(!st||!ss||ss.tm.direction==="WAIT")return null;
  const q=st.q,hs=ss.hs,mc=ss.mc,ms=window.__microState,sv=window.__structureV38||{},x={direction:ss.tm.direction,longConf:ss.sm.long,shortConf:ss.sm.short,trendScore:q.trendScore,momScore:q.momScore,volScore:q.volScore,structureScore:q.structureScore,adx:q.adx,histUp:hs.h4?.up??50,mtf:mc.avg,mfi:q.mfi,cmf:q.cmf,microScore:assetClass()==="CRYPTO"?ms?.composite?.score:null,sweepScore:sv.sweep?.score,sweepType:sv.sweep?.type,frictionBps:sv.friction?.roundTripBps,netR:0};
  return mlFeatureRow(x)
}
function empiricalLens(){
  const ss=window.__signalState;if(!ss||ss.tm.direction==="WAIT")return null;const raw=Math.max(ss.sm.long,ss.sm.short),dir=ss.tm.direction,src=analysisSource(),all=resolvedChronological(src).filter(x=>x.direction===dir),near=all.filter(x=>Math.abs(Math.max(+x.longConf||0,+x.shortConf||0)-raw)<=5),rows=near.length>=20?near:all.filter(x=>Math.abs(Math.max(+x.longConf||0,+x.shortConf||0)-raw)<=10),n=rows.length,w=rows.filter(x=>x.r>0).length,cal=n?(w+5)/(n+10):NaN,wi=wilsonInterval(w,n);return {raw,n,w,cal,wi}
}
function renderMlLens(){
  const emp=empiricalLens(),cur=currentMlFeatureRow();if(!emp){$("lensRaw").textContent=$("lensCal").textContent=$("lensWilson").textContent=$("lensMl").textContent=$("lensEns").textContent=$("lensEvidence").textContent="—";return}
  $("lensRaw").textContent=emp.raw.toFixed(0)+"/100";$("lensCal").textContent=emp.n>=20?(emp.cal*100).toFixed(0)+"%":"Need N≥20";$("lensWilson").textContent=emp.n?`${(emp.wi[0]*100).toFixed(0)}–${(emp.wi[1]*100).toFixed(0)}%`:"—";$("lensEvidence").textContent=`${emp.n} resolved`;
  let mp=NaN;if(mlShadow&&cur)mp=mlShadow.model.predict(cur.vals);$("lensMl").textContent=Number.isFinite(mp)?(mp*100).toFixed(0)+"%":"—";
  const usable=mlShadow?.state==="USABLE SHADOW",legacyEns=emp.n>=20&&usable&&Number.isFinite(mp)?.25*(emp.raw/100)+.40*emp.cal+.35*mp:NaN,gov=governedComponents(),ens=Number.isFinite(gov?.ensemble)?gov.ensemble:legacyEns;$("lensEns").textContent=Number.isFinite(ens)?(ens*100).toFixed(0)+"%":"—";
  if(mlShadow&&cur){const c=mlShadow.model.contrib(cur.vals).map((v,i)=>({name:ML_FEATURES[i],v})).sort((a,b)=>Math.abs(b.v)-Math.abs(a.v)).slice(0,8);$("mlCurrentContrib").innerHTML=`<div class="mlRow"><div class="mlCell">Feature</div><div class="mlCell">Log-odds contrib.</div><div class="mlCell">Direction</div><div class="mlCell">Value</div><div class="mlCell">Note</div></div>`+c.map(x=>`<div class="mlRow"><div class="mlCell">${x.name}</div><div class="mlCell ${x.v>=0?"contribPos":"contribNeg"}">${x.v>=0?"+":""}${x.v.toFixed(3)}</div><div class="mlCell">${x.v>=0?"supports win":"opposes win"}</div><div class="mlCell">linear model</div><div class="mlCell">exact coefficient × standardized feature</div></div>`).join("")}
}
async function runResearchML(){
  const data=mlDataset(),minN=Math.max(60,+$("mlMinN").value||60),split=Math.max(.5,Math.min(.85,+$("mlSplit").value||.7)),l2=Math.max(.0001,+$("mlL2").value||.02);
  if(data.length<minN){mlShadow=null;$("mlState").textContent="NOT ENOUGH DATA";$("mlN").textContent=`${data.length}/${minN}`;$("mlNote").textContent="Need more prospective resolved cost-aware outcomes before training.";renderMlLens();return}
  const cut=Math.max(40,Math.min(data.length-20,Math.floor(data.length*split))),train=data.slice(0,cut),test=data.slice(cut);$("mlState").textContent="TRAINING WORKER";const model=await trainLogisticOffMain(train,l2),metrics=modelEval(model,test),state=metrics.state==="USABLE"?"USABLE SHADOW":"WEAK OOS";
  mlShadow={model,state,auc:metrics.auc,brier:metrics.brier,skill:metrics.skill,acc:metrics.acc,expectancy:metrics.expectancy,trainN:train.length,testN:test.length,trainedAt:Date.now()};mlShadow.fingerprint=researchDatasetFingerprint();autoVersionModel("SHADOW",mlShadow);
  $("mlN").textContent=`${train.length} / ${test.length}`;$("mlAuc").textContent=Number.isFinite(metrics.auc)?metrics.auc.toFixed(3):"—";$("mlBrier").textContent=Number.isFinite(metrics.brier)?metrics.brier.toFixed(3):"—";$("mlSkill").textContent=Number.isFinite(metrics.skill)?(metrics.skill*100).toFixed(1)+"%":"—";$("mlAcc").textContent=Number.isFinite(metrics.acc)?(metrics.acc*100).toFixed(1)+"%":"—";$("mlState").textContent=state;$("mlState").className=state==="USABLE SHADOW"?"good":"neutral";
  const weights=ML_FEATURES.map((name,i)=>({name,w:model.w[i+1]})).sort((a,b)=>Math.abs(b.w)-Math.abs(a.w));$("mlFeatures").innerHTML=`<div class="mlRow"><div class="mlCell">Feature</div><div class="mlCell">Coefficient</div><div class="mlCell">Effect</div><div class="mlCell">Rank</div><div class="mlCell">Scope</div></div>`+weights.map((x,i)=>`<div class="mlRow"><div class="mlCell">${escapeHtml(x.name)}</div><div class="mlCell ${x.w>=0?"contribPos":"contribNeg"}">${x.w>=0?"+":""}${x.w.toFixed(3)}</div><div class="mlCell">${x.w>=0?"positive":"negative"}</div><div class="mlCell">#${i+1}</div><div class="mlCell">utility-weighted standardized temporal model</div></div>`).join("");
  $("mlNote").textContent=`Chronological split · train ${train.length}, test ${test.length} · no random shuffle · utility-weighted training. ${state==="USABLE SHADOW"?"OOS AUC/Brier/expectancy gates passed; model remains advisory.":"OOS gates not passed; do not use this model for decision weighting."}`;renderMlLens()
}

let governedEnsemble=null,driftSnapshot=null;

function confidenceOfRow(x){return clamp(Math.max(+x.longConf||0,+x.shortConf||0),0,100)/100}
function calibrationBins(rows){
  const defs=[[50,54],[55,59],[60,64],[65,69],[70,74],[75,79],[80,84],[85,89],[90,100]],out=[];
  for(const [lo,hi] of defs){
    const z=rows.filter(x=>{const c=confidenceOfRow(x)*100;return c>=lo&&c<=hi});
    if(!z.length)continue;
    const n=z.length,w=z.filter(x=>x.r>0).length,pred=z.reduce((a,x)=>a+confidenceOfRow(x),0)/n,obs=w/n,wi=wilsonInterval(w,n);
    out.push({lo,hi,n,w,pred,obs,wi,rows:z})
  }
  return out
}
function pavCalibration(rows){
  const bins=calibrationBins(rows),blocks=bins.map(x=>({...x,prob:x.obs,sourceBins:[x]}));
  let i=0;
  while(i<blocks.length-1){
    if(blocks[i].prob<=blocks[i+1].prob+1e-12){i++;continue}
    const a=blocks[i],b=blocks[i+1],n=a.n+b.n,w=a.w+b.w,merged={lo:a.lo,hi:b.hi,n,w,pred:(a.pred*a.n+b.pred*b.n)/n,obs:w/n,prob:w/n,wi:wilsonInterval(w,n),rows:[...a.rows,...b.rows],sourceBins:[...a.sourceBins,...b.sourceBins]};
    blocks.splice(i,2,merged);i=Math.max(0,i-1)
  }
  return {
    bins,blocks,
    predict(conf){
      const c=clamp(conf,0,1)*100;if(!blocks.length)return NaN;
      const b=blocks.find(x=>c>=x.lo&&c<=x.hi)||blocks.reduce((best,x)=>Math.abs(c-(x.lo+x.hi)/2)<Math.abs(c-(best.lo+best.hi)/2)?x:best,blocks[0]);
      return b.prob
    }
  }
}
function calibrationDiagnostics(){
  const rows=resolvedChronological(analysisSource()),pav=pavCalibration(rows);let ece=0,mce=0,brierRaw=0,brierCal=0;
  for(const x of rows){const p=confidenceOfRow(x),y=x.r>0?1:0,pc=pav.predict(p);brierRaw+=(p-y)**2;if(Number.isFinite(pc))brierCal+=(pc-y)**2}
  for(const b of pav.bins){const gap=Math.abs(b.pred-b.obs);ece+=gap*b.n;mce=Math.max(mce,gap)}
  const n=rows.length,base=n?rows.filter(x=>x.r>0).length/n:NaN,baseB=n?rows.reduce((a,x)=>a+(base-(x.r>0?1:0))**2,0)/n:NaN;brierRaw=n?brierRaw/n:NaN;brierCal=n?brierCal/n:NaN;
  const folds=makePurgedWalkForwardFolds(rows,{folds:4,purge:3,embargo:3,testFrac:.15,minTrain:40}),oos=[];
  for(const f of folds){const tr=(f.trainIndices||Array.from({length:f.trainEnd-f.trainStart},(_,i)=>f.trainStart+i)).map(i=>rows[i]).filter(Boolean),te=(f.testIndices||Array.from({length:f.testEnd-f.testStart},(_,i)=>f.testStart+i)).map(i=>rows[i]).filter(Boolean);if(tr.length<30||te.length<8)continue;const m=pavCalibration(tr),br=tr.filter(x=>x.r>0).length/tr.length;for(const x of te)oos.push({p:m.predict(confidenceOfRow(x)),raw:confidenceOfRow(x),y:x.r>0?1:0,base:br})}
  const oosB=oos.length?oos.reduce((a,x)=>a+(x.p-x.y)**2,0)/oos.length:NaN,oosBase=oos.length?oos.reduce((a,x)=>a+(x.base-x.y)**2,0)/oos.length:NaN,oosRaw=oos.length?oos.reduce((a,x)=>a+(x.raw-x.y)**2,0)/oos.length:NaN,oosSkill=Number.isFinite(oosBase)&&oosBase?1-oosB/oosBase:NaN;
  return {n,pav,ece:n?ece/n:NaN,mce,brierRaw,brierCal,skill:Number.isFinite(baseB)&&baseB?1-brierCal/baseB:NaN,base,oof:{n:oos.length,brier:oosB,rawBrier:oosRaw,skill:oosSkill,baseBrier:oosBase}}
}
function modelEval(model,test){
  const pred=test.map(r=>({p:model.predict(r.vals),y:r.label,utility:Number.isFinite(r.utility)?r.utility:metricR(r.row)})),brier=pred.length?pred.reduce((a,x)=>a+(x.p-x.y)**2,0)/pred.length:NaN,base=Number.isFinite(+model?.baseRate)?+model.baseRate:NaN,baseB=pred.length&&Number.isFinite(base)?pred.reduce((a,x)=>a+(base-x.y)**2,0)/pred.length:NaN,auc=aucMetric(pred),acc=pred.length?pred.filter(x=>(x.p>=.5?1:0)===x.y).length/pred.length:NaN,skill=Number.isFinite(baseB)&&baseB?1-brier/baseB:NaN,trade=pred.filter(x=>x.p>=.55&&Number.isFinite(x.utility)),expectancy=trade.length?trade.reduce((a,x)=>a+x.utility,0)/trade.length:NaN;
  return {n:test.length,auc,brier,skill,acc,expectancy,tradeN:trade.length,state:test.length>=20&&auc>=.55&&skill>0&&trade.length>=8&&expectancy>0?"USABLE":"WEAK"}
}
function trainTemporalModel(data,l2=.02,split=.7,minTrain=40,minTest=20){
  if(data.length<minTrain+minTest)return null;const cut=Math.max(minTrain,Math.min(data.length-minTest,Math.floor(data.length*split))),train=data.slice(0,cut),test=data.slice(cut),model=trainLogistic(train,l2),metrics=modelEval(model,test);
  return {model,trainN:train.length,testN:test.length,metrics}
}
async function trainTemporalModelAsync(data,l2=.02,split=.7,minTrain=40,minTest=20){
  if(data.length<minTrain+minTest)return null;const cut=Math.max(minTrain,Math.min(data.length-minTest,Math.floor(data.length*split))),train=data.slice(0,cut),test=data.slice(cut),model=await trainLogisticOffMain(train,l2),metrics=modelEval(model,test);return {model,trainN:train.length,testN:test.length,metrics}
}
function regimeDataset(regime){
  return mlDataset().filter(x=>x.row.regime===regime)
}
function trainRegimeModels(l2=.02,split=.7){
  const regimes=[...new Set(mlDataset().map(x=>x.row.regime).filter(Boolean))],models={};
  for(const regime of regimes){const data=regimeDataset(regime),fit=trainTemporalModel(data,l2,split,40,20);if(fit)models[regime]=fit}
  return models
}
async function trainRegimeModelsAsync(l2=.02,split=.7){const regimes=[...new Set(mlDataset().map(x=>x.row.regime).filter(Boolean))],models={};for(const regime of regimes){const data=regimeDataset(regime),fit=await trainTemporalModelAsync(data,l2,split,50,20);if(fit)models[regime]=fit}return models}
function currentHierarchicalProbability(){
  const st=window.__radarState;if(!st)return null;const h=hierarchicalReliability(st.symbol,st.tf,st.mode,st.q.regime,st.source||analysisSource());
  return {p:h.shrunkHit,n:h.exact.n,globalN:h.global.n,h}
}
function governedComponents(){
  const emp=empiricalLens(),cur=currentMlFeatureRow(),cal=governedEnsemble?.calibration,st=window.__radarState;if(!emp||!cur||!st)return null;
  const raw=emp.raw/100,pav=cal?.pav?.predict(raw),hier=currentHierarchicalProbability(),globalFit=governedEnsemble?.global,regFit=governedEnsemble?.regimes?.[st.q.regime],globalP=globalFit?.metrics?.state==="USABLE"?globalFit.model.predict(cur.vals):NaN,regimeP=regFit?.metrics?.state==="USABLE"?regFit.model.predict(cur.vals):NaN;
  const parts=[{name:"Raw",p:raw,w:.10,usable:true},{name:"PAV",p:pav,w:.25,usable:Number.isFinite(pav)&&cal?.oof?.n>=30&&Number.isFinite(cal?.oof?.skill)&&cal.oof.skill>0},{name:"Hierarchical",p:hier?.p,w:.25,usable:Number.isFinite(hier?.p)&&hier.globalN>=20},{name:"Global ML",p:globalP,w:.20,usable:Number.isFinite(globalP)},{name:"Regime ML",p:regimeP,w:.20,usable:Number.isFinite(regimeP)}].filter(x=>x.usable);
  const sw=parts.reduce((a,x)=>a+x.w,0),ensemble=sw?parts.reduce((a,x)=>a+x.p*x.w,0)/sw:NaN;
  return {raw,pav,hier,globalP,regimeP,parts,ensemble}
}
async function trainGovernedEnsemble(){
  const data=mlDataset(),split=Math.max(.5,Math.min(.85,+$("mlSplit").value||.7)),l2=Math.max(.0001,+$("mlL2").value||.02);if(data.length<90){toast("Need at least 90 resolved outcomes for governed ensemble","warn");return}
  if($("govState"))$("govState").textContent="TRAINING WORKER";const [global,regimes]=await Promise.all([trainTemporalModelAsync(data,l2,split,50,20),trainRegimeModelsAsync(l2,split)]),calibration=calibrationDiagnostics();governedEnsemble={global,regimes,calibration,trainedAt:Date.now()};renderGovernedEnsemble();runDriftMonitor();renderDecisionWaterfall();renderMlLens()
}
function renderGovernedEnsemble(){
  const g=governedEnsemble;if(!g){return}
  const st=window.__radarState,c=governedComponents(),reg=st?g.regimes?.[st.q.regime]:null,state=(g.global?.metrics?.state==="USABLE"&&g.calibration?.oof?.n>=30&&g.calibration.oof.skill>0)?"GOVERNED SHADOW":"LEARNING";
  $("govGlobal").textContent=g.global?`${g.global.metrics.state} · AUC ${Number.isFinite(g.global.metrics.auc)?g.global.metrics.auc.toFixed(2):"—"}`:"N/A";
  $("govRegime").textContent=reg?`${reg.metrics.state} · N ${reg.trainN+reg.testN}`:"NO REGIME MODEL";$("govCal").textContent=g.calibration?.oof?.n>=30?`${Number.isFinite(g.calibration.oof.brier)?g.calibration.oof.brier.toFixed(3):"—"} OOF Brier · skill ${Number.isFinite(g.calibration.oof.skill)?(g.calibration.oof.skill*100).toFixed(1)+"%":"—"}`:"LEARNING";$("govHier").textContent=c?.hier?`${(c.hier.p*100).toFixed(0)}% · exact N ${c.hier.n}`:"—";$("govEnsemble").textContent=Number.isFinite(c?.ensemble)?(c.ensemble*100).toFixed(0)+"%":"—";$("govState").textContent=state;
  const rows=[["GLOBAL",g.global],...Object.entries(g.regimes).map(([k,v])=>[k,v])];
  $("govModels").innerHTML=rows.length?`<div class="govRow"><div class="govCell">Model</div><div class="govCell">Train/Test</div><div class="govCell">AUC</div><div class="govCell">Brier skill</div><div class="govCell">Accuracy</div><div class="govCell">Gate</div></div>`+rows.map(([name,x])=>`<div class="govRow"><div class="govCell">${name}</div><div class="govCell">${x?`${x.trainN}/${x.testN}`:"—"}</div><div class="govCell">${x&&Number.isFinite(x.metrics.auc)?x.metrics.auc.toFixed(3):"—"}</div><div class="govCell">${x&&Number.isFinite(x.metrics.skill)?(x.metrics.skill*100).toFixed(1)+"%":"—"}</div><div class="govCell">${x&&Number.isFinite(x.metrics.acc)?(x.metrics.acc*100).toFixed(1)+"%":"—"}</div><div class="govCell">${x?.metrics?.state||"N/A"}</div></div>`).join(""):'<div class="emptyState">No models trained.</div>';
  $("govNote").textContent=`Base engine weights are frozen. Governed ensemble uses only components with evidence gates. ${Object.keys(g.regimes).length} regime model(s) trained.`;
  renderCalibrationGovernance()
}
function renderCalibrationGovernance(){
  const d=governedEnsemble?.calibration||calibrationDiagnostics();$("govEce").textContent=Number.isFinite(d.ece)?(d.ece*100).toFixed(1)+" pp":"—";$("govMce").textContent=Number.isFinite(d.mce)?(d.mce*100).toFixed(1)+" pp":"—";$("govBrierRaw").textContent=Number.isFinite(d.brierRaw)?d.brierRaw.toFixed(3):"—";$("govBrierCal").textContent=Number.isFinite(d.brierCal)?d.brierCal.toFixed(3):"—";$("govCalSkill").textContent=Number.isFinite(d.skill)?(d.skill*100).toFixed(1)+"%":"—";$("govCalN").textContent=d.n;
  const blocks=d.pav.blocks;$("govCalibration").innerHTML=blocks.length?`<div class="govRow"><div class="govCell">Confidence range</div><div class="govCell">N</div><div class="govCell">Raw pred.</div><div class="govCell">Observed</div><div class="govCell">PAV calibrated</div><div class="govCell">Wilson 95%</div></div>`+blocks.map(b=>`<div class="govRow"><div class="govCell">${b.lo}–${b.hi}</div><div class="govCell">${b.n}</div><div class="govCell">${(b.pred*100).toFixed(0)}%</div><div class="govCell">${(b.obs*100).toFixed(0)}%</div><div class="govCell">${(b.prob*100).toFixed(0)}%</div><div class="govCell">${(b.wi[0]*100).toFixed(0)}–${(b.wi[1]*100).toFixed(0)}%</div></div>`).join(""):'<div class="emptyState">Need resolved outcomes.</div>'
}
function quantileEdges(a,k=5){
  const s=[...a].sort((x,y)=>x-y);if(!s.length)return [];const e=[];for(let i=1;i<k;i++)e.push(percentile(s,i/k));return e
}
function bucketIndex(v,edges){let i=0;while(i<edges.length&&v>edges[i])i++;return i}
function psiFeature(base,recent,index){
  const b=base.map(x=>x.vals[index]),r=recent.map(x=>x.vals[index]),edges=quantileEdges(b,5),bins=edges.length+1;let psi=0;
  for(let k=0;k<bins;k++){const bp=Math.max(.001,b.filter(x=>bucketIndex(x,edges)===k).length/Math.max(1,b.length)),rp=Math.max(.001,r.filter(x=>bucketIndex(x,edges)===k).length/Math.max(1,r.length));psi+=(rp-bp)*Math.log(rp/bp)}
  return psi
}
function outcomeStats(rows){
  const n=rows.length,avg=n?rows.reduce((a,x)=>a+x.r,0)/n:0,win=n?rows.filter(x=>x.r>0).length/n:0,conf=n?rows.reduce((a,x)=>a+confidenceOfRow(x),0)/n:0;return {n,avg,win,conf,gap:conf-win}
}
function runDriftMonitor(){
  const data=mlDataset(),resolved=resolvedChronological(analysisSource());if(data.length<40||resolved.length<40){$("driftState").textContent="LEARNING";$("driftFeatures").innerHTML='<div class="emptyState">Need at least 40 resolved observations.</div>';return}
  const cut=Math.max(20,Math.floor(data.length*.7)),base=data.slice(0,cut),recent=data.slice(cut),psis=ML_FEATURES.map((name,i)=>({name,psi:psiFeature(base,recent,i)})).sort((a,b)=>b.psi-a.psi),avgPsi=psis.reduce((a,x)=>a+x.psi,0)/psis.length,maxPsi=psis[0]?.psi||0;
  const rcut=Math.max(20,Math.floor(resolved.length*.7)),bs=outcomeStats(resolved.slice(0,rcut)),rs=outcomeStats(resolved.slice(rcut)),winShift=rs.win-bs.win,calShift=Math.abs(rs.gap)-Math.abs(bs.gap);
  let state="STABLE";if(avgPsi>=.20||maxPsi>=.35||rs.avg<0&&bs.avg>0||Math.abs(winShift)>=.20)state="DRIFT";else if(avgPsi>=.10||maxPsi>=.20||Math.abs(winShift)>=.10||calShift>=.08)state="WATCH";
  driftSnapshot={state,avgPsi,maxPsi,base:bs,recent:rs,psis,winShift,calShift,ts:Date.now()};
  $("driftState").textContent=state;$("driftState").className=state==="STABLE"?"stateStable":state==="WATCH"?"stateWatch":"stateDrift";$("driftPsi").textContent=avgPsi.toFixed(3);$("driftRecentExp").textContent=rs.avg.toFixed(2)+" R";$("driftBaseExp").textContent=bs.avg.toFixed(2)+" R";$("driftWinShift").textContent=(winShift*100>=0?"+":"")+(winShift*100).toFixed(1)+" pp";$("driftCalShift").textContent=(calShift*100>=0?"+":"")+(calShift*100).toFixed(1)+" pp";
  $("driftFeatures").innerHTML=`<div class="driftRow"><div class="driftCell">Feature</div><div class="driftCell">PSI</div><div class="driftCell">State</div><div class="driftCell">Rank</div><div class="driftCell">Interpretation</div></div>`+psis.slice(0,10).map((x,i)=>`<div class="driftRow"><div class="driftCell">${x.name}</div><div class="driftCell">${x.psi.toFixed(3)}</div><div class="driftCell ${x.psi>=.25?"stateDrift":x.psi>=.1?"stateWatch":"stateStable"}">${x.psi>=.25?"SHIFT":x.psi>=.1?"WATCH":"STABLE"}</div><div class="driftCell">#${i+1}</div><div class="driftCell">${x.psi>=.25?"material distribution shift":x.psi>=.1?"moderate shift":"small shift"}</div></div>`).join("");
  $("driftNote").textContent=`Baseline N ${bs.n}, recent N ${rs.n}. State ${state}. PSI compares feature distributions; performance drift compares chronological resolved outcomes.`;renderGovernedEnsemble();renderDecisionWaterfall()
}
function decisionWaterfallRows(){
  const st=window.__radarState,ss=window.__signalState;if(!st||!ss)return [];const sq=setupQualityCurrent(),emp=empiricalLens(),gov=governedComponents(),life=strategyLifecycle(),g=riskGuard(),cb=paperCircuitBreaker(),dr=driftSnapshot;
  const raw=emp?.raw??Math.max(ss.sm.long,ss.sm.short),dir=ss.tm.direction,rows=[
    {name:"Base engine confidence",value:raw,kind:"score",note:`${dir} · validated base engine remains unchanged`},
    {name:"Setup quality",value:sq?.overall,kind:"score",note:sq?.blocker||"—"},
    {name:"Empirical calibration",value:Number.isFinite(gov?.pav)?gov.pav*100:NaN,kind:"prob",note:`resolved evidence N ${emp?.n||0}`},
    {name:"Hierarchical reliability",value:Number.isFinite(gov?.hier?.p)?gov.hier.p*100:NaN,kind:"prob",note:`exact N ${gov?.hier?.n||0}`},
    {name:"Global shadow ML",value:Number.isFinite(gov?.globalP)?gov.globalP*100:NaN,kind:"prob",note:governedEnsemble?.global?.metrics?.state||"not trained"},
    {name:"Regime shadow ML",value:Number.isFinite(gov?.regimeP)?gov.regimeP*100:NaN,kind:"prob",note:st.q.regime},
    {name:"Governed ensemble",value:Number.isFinite(gov?.ensemble)?gov.ensemble*100:NaN,kind:"prob",note:"research-only"},
    {name:"Risk guard multiplier",value:g.mult*100,kind:"gate",note:g.state},
    {name:"Strategy lifecycle",value:life.mult*100,kind:"gate",note:life.state},
    {name:"Circuit breaker",value:cb.mult*100,kind:"gate",note:cb.state},
    {name:"Drift state",value:dr?dr.avgPsi*100:NaN,kind:"drift",note:dr?.state||"not calculated"}
  ];return rows
}
function renderDecisionWaterfall(){
  const rows=decisionWaterfallRows(),box=$("decisionWaterfall");if(!box)return;if(!rows.length){box.innerHTML='<div class="emptyState">Run analysis first.</div>';return}
  box.innerHTML=`<div class="waterRow"><div class="waterCell">Component</div><div class="waterCell">Value</div><div class="waterCell">Type</div><div class="waterCell">Visual</div><div class="waterCell">Note</div></div>`+rows.map(x=>{const v=Number.isFinite(x.value)?x.value:null,w=v==null?0:clamp(Math.abs(v),0,100);return `<div class="waterRow"><div class="waterCell">${x.name}</div><div class="waterCell">${v==null?"—":v.toFixed(1)+(x.kind==="drift"?"":"%")}</div><div class="waterCell">${x.kind}</div><div class="waterCell"><div class="barTiny"><i style="width:${w}%"></i></div></div><div class="waterCell">${x.note}</div></div>`}).join("")
}

const EXP_REGISTRY_KEY="experimentRegistryV46";
let purgedMlState=null;

function researchGovConfig(){
  return {folds:Math.max(2,Math.min(8,+$("rgFolds")?.value||4)),purge:Math.max(0,+$("rgPurge")?.value||3),embargo:Math.max(0,+$("rgEmbargo")?.value||3),testFrac:Math.max(.08,Math.min(.25,+$("rgTestFrac")?.value||.12)),bootstrap:Math.max(100,Math.min(2000,+$("rgBootstrap")?.value||400)),block:Math.max(2,Math.min(20,+$("rgBlock")?.value||5)),l2:Math.max(.0001,+$("mlL2")?.value||.02)}
}
function labelIntervalOf(x){const r=x?.row||x||{},start=+(r.outcomeStartTs||r.ts||r.eventStartTs||0),end=+(r.outcomeEndTsExpected||r.outcomeEndTs||r.resolvedTs||r.eventEndTs||start);return {start,end:Math.max(start,end)}}
function makePurgedWalkForwardFolds(dataOrN,opt={}){
  const data=Array.isArray(dataOrN)?dataOrN:null,n=data?data.length:+dataOrN||0,folds=Math.max(2,Math.min(8,+opt.folds||4)),purge=Math.max(0,+opt.purge||0),embargo=Math.max(0,+opt.embargo||0),testSize=Math.max(8,Math.floor(n*(+opt.testFrac||.12))),minTrain=Math.max(30,+opt.minTrain||Math.floor(n*.35)),stride=testSize+embargo,totalSpan=(folds-1)*stride+testSize,firstTest=Math.max(minTrain+purge,n-totalSpan),out=[];
  for(let f=0;f<folds;f++){const testStart=firstTest+f*stride,testEnd=Math.min(n,testStart+testSize),trainEnd=Math.max(0,testStart-purge);if(trainEnd<minTrain||testEnd-testStart<8)continue;const fold={fold:f+1,trainStart:0,trainEnd,purgeStart:trainEnd,purgeEnd:testStart,testStart,testEnd,embargoStart:testEnd,embargoEnd:Math.min(n,testEnd+embargo),exactPurged:0};
    if(data){const testIndices=Array.from({length:testEnd-testStart},(_,i)=>testStart+i),intervals=testIndices.map(i=>labelIntervalOf(data[i])).filter(x=>x.start>0),testLabelStart=intervals.length?Math.min(...intervals.map(x=>x.start)):0,trainIndices=[];for(let i=0;i<trainEnd;i++){const li=labelIntervalOf(data[i]);if(testLabelStart&&li.end>=testLabelStart){fold.exactPurged++;continue}trainIndices.push(i)}fold.trainIndices=trainIndices;fold.testIndices=testIndices;fold.testLabelStart=testLabelStart;fold.testLabelEnd=intervals.length?Math.max(...intervals.map(x=>x.end)):0;if(trainIndices.length<minTrain)continue}out.push(fold)}return out
}
function deterministicRng(seed=123456789){let x=(seed>>>0)||1;return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296}}
function movingBlockBootstrapIndices(n,reps=400,block=5,seed=9173){
  const rng=deterministicRng(seed),out=[],b=Math.max(1,Math.min(block,n));for(let r=0;r<reps;r++){const ix=[];while(ix.length<n){const st=Math.floor(rng()*Math.max(1,n-b+1));for(let k=0;k<b&&ix.length<n;k++)ix.push(st+k)}out.push(ix)}return out
}
function quantileSorted(a,p){const s=[...a].filter(Number.isFinite).sort((x,y)=>x-y);if(!s.length)return NaN;const i=(s.length-1)*p,l=Math.floor(i),h=Math.ceil(i);return l===h?s[l]:s[l]+(s[h]-s[l])*(i-l)}
function ci95(a){return [quantileSorted(a,.025),quantileSorted(a,.975)]}
function baseRateBrier(pred){if(!pred.length)return NaN;return pred.reduce((a,x)=>{const base=Number.isFinite(+x.base)?+x.base:.5;return a+(base-x.y)**2},0)/pred.length}
function pooledOosMetrics(pred){
  if(!pred.length)return {n:0,auc:NaN,brier:NaN,skill:NaN,acc:NaN,exp:NaN,win:NaN};const auc=aucMetric(pred),brier=pred.reduce((a,x)=>a+(x.p-x.y)**2,0)/pred.length,bb=baseRateBrier(pred),skill=bb?1-brier/bb:NaN,acc=pred.filter(x=>(x.p>=.5?1:0)===x.y).length/pred.length,rs=pred.map(x=>x.r).filter(Number.isFinite),exp=rs.length?rs.reduce((a,b)=>a+b,0)/rs.length:NaN,win=rs.length?rs.filter(x=>x>0).length/rs.length:NaN;return {n:pred.length,auc,brier,skill,acc,exp,win}
}
function bootstrapOosMetrics(pred,reps=400,block=5){
  if(pred.length<10)return null;const idx=movingBlockBootstrapIndices(pred.length,reps,block),auc=[],brier=[],exp=[],win=[];for(const sample of idx){const z=sample.map(i=>pred[i]),m=pooledOosMetrics(z);if(Number.isFinite(m.auc))auc.push(m.auc);if(Number.isFinite(m.brier))brier.push(m.brier);if(Number.isFinite(m.exp))exp.push(m.exp);if(Number.isFinite(m.win))win.push(m.win)}return {auc:ci95(auc),brier:ci95(brier),exp:ci95(exp),win:ci95(win),reps:idx.length,block}
}
function coefficientStability(models){
  if(models.length<2)return {rows:[],medianSign:NaN,medianRank:NaN,meanCos:NaN,stable:0,unstable:ML_FEATURES.length,state:"LEARNING"};const vecs=models.map(x=>x.model.w.slice(1)),ranks=vecs.map(v=>{const ord=v.map((x,i)=>({i,a:Math.abs(x)})).sort((a,b)=>b.a-a.a),r=Array(v.length);ord.forEach((x,k)=>r[x.i]=k+1);return r}),rows=[];
  for(let j=0;j<ML_FEATURES.length;j++){const vals=vecs.map(v=>v[j]).filter(Number.isFinite),pos=vals.filter(x=>x>0).length,neg=vals.filter(x=>x<0).length,sign=vals.length?Math.max(pos,neg)/vals.length:0,mean=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:NaN,sd=vals.length?Math.sqrt(vals.reduce((a,x)=>a+(x-mean)**2,0)/vals.length):NaN,rankVals=ranks.map(r=>r[j]),rankMean=rankVals.reduce((a,b)=>a+b,0)/rankVals.length,rankSd=Math.sqrt(rankVals.reduce((a,x)=>a+(x-rankMean)**2,0)/rankVals.length),rankStability=1-clamp(rankSd/Math.max(1,ML_FEATURES.length/2),0,1),stable=sign>=.75&&rankStability>=.6;rows.push({name:ML_FEATURES[j],sign,mean,sd,rankMean,rankStability,stable})}
  const cos=[];for(let i=0;i<vecs.length;i++)for(let j=i+1;j<vecs.length;j++){const a=vecs[i],b=vecs[j],dot=a.reduce((z,x,k)=>z+x*b[k],0),na=Math.sqrt(a.reduce((z,x)=>z+x*x,0)),nb=Math.sqrt(b.reduce((z,x)=>z+x*x,0));if(na&&nb)cos.push(dot/(na*nb))}
  const medianSign=quantileSorted(rows.map(x=>x.sign),.5),medianRank=quantileSorted(rows.map(x=>x.rankStability),.5),meanCos=cos.length?cos.reduce((a,b)=>a+b,0)/cos.length:NaN,stable=rows.filter(x=>x.stable).length,state=medianSign>=.75&&medianRank>=.6&&meanCos>=.35?"STABLE":medianSign>=.6&&meanCos>=0?"MIXED":"UNSTABLE";return {rows,medianSign,medianRank,meanCos,stable,unstable:rows.length-stable,state}
}
function renderCoefficientStability(c=purgedMlState?.coef){
  if(!c)return;$("coefSign").textContent=Number.isFinite(c.medianSign)?(c.medianSign*100).toFixed(0)+"%":"—";$("coefRank").textContent=Number.isFinite(c.medianRank)?(c.medianRank*100).toFixed(0)+"%":"—";$("coefCos").textContent=Number.isFinite(c.meanCos)?c.meanCos.toFixed(2):"—";$("coefStableN").textContent=c.stable;$("coefUnstableN").textContent=c.unstable;$("coefState").textContent=c.state;$("coefState").className=c.state==="STABLE"?"good":c.state==="UNSTABLE"?"bad":"neutral";
  $("coefTable").innerHTML=`<div class="coefRow"><div class="coefCell">Feature</div><div class="coefCell">Sign agreement</div><div class="coefCell">Mean coef.</div><div class="coefCell">Coef. SD</div><div class="coefCell">Rank stability</div><div class="coefCell">State</div></div>`+c.rows.sort((a,b)=>b.sign-a.sign||b.rankStability-a.rankStability).map(x=>`<div class="coefRow"><div class="coefCell">${x.name}</div><div class="coefCell">${(x.sign*100).toFixed(0)}%</div><div class="coefCell">${Number.isFinite(x.mean)?x.mean.toFixed(3):"—"}</div><div class="coefCell">${Number.isFinite(x.sd)?x.sd.toFixed(3):"—"}</div><div class="coefCell">${(x.rankStability*100).toFixed(0)}%</div><div class="coefCell ${x.stable?"good":"neutral"}">${x.stable?"STABLE":"WATCH"}</div></div>`).join("")
}
async function runPurgedWalkForwardML(){
  const data=mlDataset(),cfg=researchGovConfig(),folds=makePurgedWalkForwardFolds(data,cfg);if(data.length<90||folds.length<2){purgedMlState=null;$("rgGate").textContent="NOT ENOUGH DATA";$("rgNote").textContent=`Need more chronological resolved observations. Current N=${data.length}, usable folds=${folds.length}.`;runLeakageAudit();return}
  $("rgGate").textContent="RUNNING WORKER";const results=[],pooled=[];for(const f of folds){const train=(f.trainIndices||Array.from({length:f.trainEnd-f.trainStart},(_,i)=>f.trainStart+i)).map(i=>data[i]).filter(Boolean),test=(f.testIndices||Array.from({length:f.testEnd-f.testStart},(_,i)=>f.testStart+i)).map(i=>data[i]).filter(Boolean);if(train.length<50||test.length<15)continue;const model=await trainLogisticOffMain(train,cfg.l2),pred=test.map((r,i)=>({p:model.predict(r.vals),y:r.label,r:metricR(r.row),base:model.baseRate,ts:+r.row.ts||0,fold:f.fold,index:(f.testIndices?.[i]??f.testStart+i)})),metrics=pooledOosMetrics(pred);results.push({...f,trainN:train.length,testN:test.length,model,metrics,pred});pooled.push(...pred)}
  const all=pooledOosMetrics(pooled);let boot=null;try{boot=await researchWorkerTask("bootstrapOos",{pred:pooled,reps:cfg.bootstrap,block:cfg.block,seed:9173},60000)}catch{boot=bootstrapOosMetrics(pooled,cfg.bootstrap,cfg.block)}const coef=coefficientStability(results),positiveFolds=results.filter(x=>Number.isFinite(x.metrics.exp)&&x.metrics.exp>0).length,worst=results.length?Math.min(...results.map(x=>Number.isFinite(x.metrics.exp)?x.metrics.exp:Infinity)):NaN,gate=pooled.length>=60&&Number.isFinite(all.auc)&&all.auc>=.56&&Number.isFinite(all.skill)&&all.skill>0&&Number.isFinite(all.exp)&&all.exp>0&&positiveFolds/results.length>=.67&&coef.state!=="UNSTABLE"?"OOS PASS":"RESEARCH ONLY";
  purgedMlState={cfg,folds:results,pooled,metrics:all,bootstrap:boot,coef,gate,ts:Date.now()};$("rgOosN").textContent=pooled.length;$("rgAuc").textContent=Number.isFinite(all.auc)?all.auc.toFixed(3):"—";$("rgBrier").textContent=Number.isFinite(all.brier)?all.brier.toFixed(3):"—";$("rgSkill").textContent=Number.isFinite(all.skill)?(all.skill*100).toFixed(1)+"%":"—";$("rgExp").textContent=Number.isFinite(all.exp)?all.exp.toFixed(2)+" R":"—";$("rgGate").textContent=gate;$("rgGate").className=gate==="OOS PASS"?"good":"neutral";
  $("rgFoldTable").innerHTML=`<div class="rgRow"><div class="rgCell">Fold</div><div class="rgCell">Train</div><div class="rgCell">Purge</div><div class="rgCell">Test</div><div class="rgCell">AUC</div><div class="rgCell">Brier skill</div><div class="rgCell">Expectancy</div></div>`+results.map(x=>`<div class="rgRow"><div class="rgCell">${x.fold}</div><div class="rgCell">${x.trainN}</div><div class="rgCell">${x.purgeEnd-x.purgeStart}</div><div class="rgCell">${x.testN}</div><div class="rgCell">${Number.isFinite(x.metrics.auc)?x.metrics.auc.toFixed(3):"—"}</div><div class="rgCell">${Number.isFinite(x.metrics.skill)?(x.metrics.skill*100).toFixed(1)+"%":"—"}</div><div class="rgCell ${x.metrics.exp>=0?"good":"bad"}">${Number.isFinite(x.metrics.exp)?x.metrics.exp.toFixed(2)+" R":"—"}</div></div>`).join("");
  if(boot){$("rgAucCi").textContent=`${boot.auc[0].toFixed(3)}–${boot.auc[1].toFixed(3)}`;$("rgBrierCi").textContent=`${boot.brier[0].toFixed(3)}–${boot.brier[1].toFixed(3)}`;$("rgExpCi").textContent=`${boot.exp[0].toFixed(2)}–${boot.exp[1].toFixed(2)} R`;$("rgWinCi").textContent=`${(boot.win[0]*100).toFixed(0)}–${(boot.win[1]*100).toFixed(0)}%`}
  $("rgPositiveFolds").textContent=`${positiveFolds}/${results.length}`;$("rgWorstFold").textContent=Number.isFinite(worst)?worst.toFixed(2)+" R":"—";renderCoefficientStability(coef);$("rgNote").textContent=`Expanding-window OOS · ${results.length} folds · row purge ${cfg.purge} · embargo ${cfg.embargo} · exact interval purges ${results.reduce((a,x)=>a+(x.exactPurged||0),0)} · pooled OOS N ${pooled.length} · heavy training/bootstrap dispatched off-main when Worker is available.`;runLeakageAudit()
}
function leakageFeatureMissingness(){
  const rows=resolvedChronological(analysisSource()),map={confidence:["longConf","shortConf"],trend:["trendScore"],momentum:["momScore"],volume:["volScore"],structure:["structureScore"],adx:["adx"],hist:["histUp"],mtf:["mtf"],mfi:["mfi"],cmf:["cmf"],micro:["microScore"],sweep:["sweepScore"],friction:["frictionBps"]},out=[];for(const [name,keys] of Object.entries(map)){const miss=rows.length?rows.filter(r=>!keys.some(k=>Number.isFinite(+r[k]))).length/rows.length:1;out.push({name,missing:miss})}return out
}
function runLeakageAudit(){
  const rows=resolvedChronological(analysisSource()),cfg=researchGovConfig(),futureTokens=["netr","rresult","outcome","future","pnl","realized","status","close"],featureLeak=ML_FEATURES.filter(x=>futureTokens.some(t=>x.toLowerCase().includes(t))),seen=new Set(),dups=[];
  for(const r of rows){const key=r.id!=null?`id:${r.id}`:`${+r.ts||0}|${r.symbol||""}|${r.tf||""}|${r.mode||""}|${r.direction||""}`;if(seen.has(key))dups.push(key);else seen.add(key)}
  const missing=leakageFeatureMissingness(),worstMissing=missing.length?Math.max(...missing.map(x=>x.missing)):1,checks=[
    {name:"Chronological source isolation",state:rows.length?"PASS":"WARN",note:rows.length?`${rows.length} resolved rows from ${analysisSource()}; folds preserve chronology.`:"No resolved rows."},
    {name:"Duplicate signal keys",state:dups.length?"WARN":"PASS",note:dups.length?`${dups.length} duplicate key(s) detected.`:"No duplicate signal keys detected."},
    {name:"Outcome/future fields in ML feature list",state:featureLeak.length?"FAIL":"PASS",note:featureLeak.length?`Potential leakage: ${featureLeak.join(", ")}`:"ML_FEATURES excludes known outcome/result field names."},
    {name:"Normalization fit scope",state:"PASS",note:"Each fold fits mean/SD on training data only; test observations use the frozen train transform."},
    {name:"Purge / embargo",state:cfg.purge>0&&cfg.embargo>0?"PASS":cfg.purge>0||cfg.embargo>0?"WARN":"FAIL",note:`purge=${cfg.purge}, embargo=${cfg.embargo}. Non-zero gaps reduce overlap risk.`},
    {name:"Feature completeness",state:worstMissing<=.25?"PASS":worstMissing<=.5?"WARN":"FAIL",note:`Worst raw-field missingness ${(worstMissing*100).toFixed(0)}%. Missing values may be neutral-filled in the shadow model.`},
    {name:"PAV calibration scope",state:calibrationDiagnostics().oof.n>=30?"PASS":"WARN",note:`PAV diagnostics use chronological OOF predictions (N ${calibrationDiagnostics().oof.n}); current inference may fit all past resolved rows.`},
    {name:"Survivorship / provider bias",state:"WARN",note:"This local audit cannot prove absence of delisting, provider-history, or universe survivorship bias."}
  ],sev=checks.some(x=>x.state==="FAIL")?"FAIL":checks.some(x=>x.state==="WARN")?"WARN":"PASS";
  $("leakState").textContent=sev;$("leakState").className=sev==="PASS"?"auditPass":sev==="FAIL"?"auditFail":"auditWarn";$("leakDup").textContent=dups.length;$("leakFuture").textContent=featureLeak.length;$("leakNorm").textContent="TRAIN ONLY";$("leakPurge").textContent=`${cfg.purge} / ${cfg.embargo}`;$("leakMissing").textContent=(worstMissing*100).toFixed(0)+"% worst";$("leakTable").innerHTML=`<div class="leakRow"><div class="leakCell">Check</div><div class="leakCell">State</div><div class="leakCell">Finding</div></div>`+checks.map(x=>`<div class="leakRow"><div class="leakCell">${x.name}</div><div class="leakCell ${x.state==="PASS"?"auditPass":x.state==="FAIL"?"auditFail":"auditWarn"}">${x.state}</div><div class="leakCell">${x.note}</div></div>`).join("");window.__leakageAudit={state:sev,checks,duplicates:dups.length,worstMissing,ts:Date.now()};return window.__leakageAudit
}

function experimentRegistry(){if(appSettings().privacySessionOnly)return privacySessionState.experiments;try{return JSON.parse(localStorage.getItem(EXP_REGISTRY_KEY)||"[]")}catch{return []}}
function setExperimentRegistry(a){const rows=a.slice(0,120);if(appSettings().privacySessionOnly)privacySessionState.experiments=rows;else{archiveExperimentRows(a).catch(()=>{});localStorage.setItem(EXP_REGISTRY_KEY,JSON.stringify(rows))}renderExperimentRegistry()}
function experimentContext(points=[]){const st=window.__radarState,j=st?.j||[],lastTs=+j.at(-1)?.[0]||0;return {source:analysisSource(),symbol:st?.symbol||norm($("symbol").value),tf:st?.tf||$("tf").value,mode:st?.mode||$("mode").value,n:points.length,lastTs}}
function experimentFingerprint(ctx,p){return [ctx.source,ctx.symbol,ctx.tf,ctx.mode,ctx.n,ctx.lastTs,p.threshold,p.stopMult,p.targetR,p.costMult].join("|")}
function experimentFolds(points,cfg){return makePurgedWalkForwardFolds(points.length,{folds:cfg.folds,purge:cfg.purge,embargo:cfg.embargo,testFrac:cfg.testFrac,minTrain:Math.max(30,Math.floor(points.length*.35))})}
function experimentOos(points,p,cfg){
  const app=appSettings(),folds=experimentFolds(points,cfg),all=[],per=[];for(const f of folds){const vals=paramWfTrade(points,p,app,f.testStart,f.testEnd),st=statsR(vals);per.push({...f,...st,vals});all.push(...vals)}const st=statsR(all),positive=per.length?per.filter(x=>x.n&&x.avg>0).length/per.length:0;return {...st,positive,folds:per,vals:all}
}
function experimentDifferenceBootstrap(baseVals,candVals,reps=500,seed=54017){
  const a=(baseVals||[]).filter(Number.isFinite),b=(candVals||[]).filter(Number.isFinite);if(a.length<20||b.length<20)return {p:NaN,lo:NaN,hi:NaN,reps:0};const rng=deterministicRng(seed),diff=[];for(let q=0;q<reps;q++){let sa=0,sb=0;for(let i=0;i<a.length;i++)sa+=a[Math.floor(rng()*a.length)];for(let i=0;i<b.length;i++)sb+=b[Math.floor(rng()*b.length)];diff.push(sb/b.length-sa/a.length)}const p=diff.filter(x=>x<=0).length/diff.length;return {p,lo:quantileSorted(diff,.025),hi:quantileSorted(diff,.975),reps:diff.length}
}
async function runRegisteredExperiment(){
  const name=String($("expName")?.value||"Candidate").trim().slice(0,60)||"Candidate",p={threshold:Math.max(55,Math.min(85,+$("expThreshold").value||64)),stopMult:Math.max(.75,Math.min(3,+$("expStop").value||1.5)),targetR:Math.max(.75,Math.min(5,+$("expTarget").value||2)),costMult:Math.max(.5,Math.min(4,+$("expCost").value||1))},cfg=researchGovConfig();$("expNote").textContent="Running candidate on purged chronological development OOS windows; final 15% remains locked…";
  try{
    const points=await rollingPoints();if(points.length<60)throw Error("Need at least 60 historical points.");const lockStart=Math.max(40,Math.floor(points.length*.85)),devPoints=points.slice(0,lockStart),lockedHoldout=points.slice(lockStart),ctx=experimentContext(points),fingerprint=experimentFingerprint(ctx,p),reg=experimentRegistry(),familyKey=[ctx.source,ctx.symbol,ctx.tf,ctx.mode,ctx.n,ctx.lastTs].join("|"),familyTrials=reg.filter(x=>x.familyKey===familyKey).length,dup=reg.find(x=>x.fingerprint===fingerprint),baselineP={threshold:64,stopMult:1.5,targetR:2,costMult:1},baseline=experimentOos(devPoints,baselineP,cfg),candidate=experimentOos(devPoints,p,cfg),boot=experimentDifferenceBootstrap(baseline.vals,candidate.vals,500,54017+familyTrials),rawP=boot.p,adjustedP=Number.isFinite(rawP)?Math.min(1,rawP*Math.max(1,familyTrials+1)):NaN,statOk=Number.isFinite(adjustedP)&&adjustedP<=.10,gate0=candidate.n>=30&&candidate.avg>0&&candidate.pf>=1.10&&candidate.positive>=.6&&candidate.avg>baseline.avg&&statOk?"CANDIDATE":candidate.n>=20&&(candidate.avg<=0||candidate.pf<.9)?"REJECTED":"EXPERIMENT",gate=familyTrials>=20&&gate0==="CANDIDATE"?"TRIAL_LIMIT":gate0;
    const row={id:Date.now(),name,created:Date.now(),version:"v57",ctx,p,familyKey,familyTrials:familyTrials+1,cfg:{folds:cfg.folds,purge:cfg.purge,embargo:cfg.embargo,testFrac:cfg.testFrac,lockedHoldoutPct:15},fingerprint,status:dup?"DUPLICATE":gate,gate,duplicateOf:dup?.id||null,developmentN:devPoints.length,lockedHoldoutN:lockedHoldout.length,lockedHoldoutEvaluated:false,multipleTesting:{method:"BOOTSTRAP_DIFF_BONFERRONI",rawP,adjustedP,familyTrials:familyTrials+1,ci:[boot.lo,boot.hi],reps:boot.reps},baseline:{n:baseline.n,avg:baseline.avg,pf:baseline.pf,dd:baseline.dd,positive:baseline.positive},candidate:{n:candidate.n,avg:candidate.avg,pf:candidate.pf,dd:candidate.dd,positive:candidate.positive},folds:candidate.folds.map(x=>({fold:x.fold,n:x.n,avg:x.avg,pf:x.pf,dd:x.dd}))};
    reg.unshift(row);setExperimentRegistry(reg);$("expNote").textContent=dup?`Duplicate history/parameter fingerprint detected. Existing experiment #${dup.id}. New run is marked DUPLICATE.`:`Stored ${gate}: candidate ${candidate.avg.toFixed(2)}R vs baseline ${baseline.avg.toFixed(2)}R · adjusted p ${Number.isFinite(adjustedP)?adjustedP.toFixed(3):"N/A"} · locked holdout N=${lockedHoldout.length}. No engine weights changed.`
  }catch(e){$("expNote").textContent="Experiment unavailable: "+e.message}
}
function promoteExperiment(id){const a=experimentRegistry(),x=a.find(v=>v.id===id);if(!x)return;if(x.gate!=="CANDIDATE"){toast("Only a CANDIDATE can be promoted in the registry.","warn");return}x.status="PROMOTED";x.promotedAt=Date.now();setExperimentRegistry(a);toast("Experiment marked PROMOTED in research registry only.","good")}
function rejectExperiment(id){const a=experimentRegistry(),x=a.find(v=>v.id===id);if(!x)return;x.status="REJECTED";x.rejectedAt=Date.now();setExperimentRegistry(a)}
function renderExperimentRegistry(){
  const a=experimentRegistry();if($("expCount"))$("expCount").textContent=a.length;const box=$("expTable");if(!box)return;box.innerHTML=a.length?`<div class="expRow"><div class="expCell">ID</div><div class="expCell">Name / Context</div><div class="expCell">Params</div><div class="expCell">Baseline</div><div class="expCell">Candidate</div><div class="expCell">Positive folds</div><div class="expCell">Status</div><div class="expCell">Action</div></div>`+a.slice(0,40).map(x=>{const cl=x.status==="PROMOTED"?"expPromoted":x.status==="CANDIDATE"?"expCandidate":x.status==="REJECTED"?"expRejected":"expResearch";const safeId=Number.isFinite(+x.id)?+x.id:0;return `<div class="expRow"><div class="expCell">${String(safeId).slice(-6)}</div><div class="expCell">${escapeHtml(x.name)}<br><small>${escapeHtml(coin(x.ctx?.symbol))} · ${escapeHtml(x.ctx?.tf||"—")} · ${escapeHtml(x.ctx?.mode||"—")}</small></div><div class="expCell">T${(+x.p.threshold).toFixed(0)} · S${(+x.p.stopMult).toFixed(2)} · R${(+x.p.targetR).toFixed(1)} · C${(+x.p.costMult).toFixed(1)}×</div><div class="expCell">${(+x.baseline.avg).toFixed(2)}R · PF ${(+x.baseline.pf).toFixed(2)}</div><div class="expCell">${(+x.candidate.avg).toFixed(2)}R · PF ${(+x.candidate.pf).toFixed(2)}</div><div class="expCell">${(+x.candidate.positive*100).toFixed(0)}%</div><div class="expCell ${cl}">${escapeHtml(x.status)}</div><div class="expCell">${x.status==="CANDIDATE"?`<button data-action-click="promoteExperiment(${safeId})">Promote</button>`:""}<button class="actionGhost" data-action-click="rejectExperiment(${safeId})">Reject</button></div></div>`}).join(""):'<div class="emptyState">No registered experiments.</div>'
}

const MODEL_VERSION_KEY="modelVersionsV47";
const ACTIVE_MODEL_VERSION_KEY="activeModelVersionV47";
const LIQ_HISTORY_KEY="observedLiquidationsV47";
const TRUE_FLOW_HISTORY_KEY="trueTradeFlowHistoryV47";
const META_ENSEMBLE_V2_KEY="metaEnsembleV2V50";
const privacySessionState={experiments:[],models:[],activeModelId:null,metaEnsemble:null,trueFlow:{}};
let metaLabelState=null,metaEnsembleV2=null,trueFlowState=null,regimeV2State=null,calibrationV2State=null,activeModelVersionId=null;

function canonicalRegime(row){
  const rv=+row.rvPercentile||0,adx=+row.adx||0,ch=+row.chop||50,trend=+row.trendScore||50,mom=+row.momScore||50;
  if(rv>=85)return "HIGH_VOL";
  if(adx>=23&&ch<=58)return trend+mom>=105?"TREND_UP":"TREND_DOWN";
  return "RANGE"
}
function currentRegimeProbabilities(){
  const st=window.__radarState;if(!st)return null;const q=st.q,adx=clamp((+q.adx||0)/45*100),chop=clamp(+q.chop||50),er=clamp((+q.efficiency||.35)*100),rv=clamp(+q.rvPercentile||50),trend=clamp(+q.trendScore||50),mom=clamp(+q.momScore||50);
  const bull=Math.max(1,.28*trend+.16*mom+.18*adx+.18*(100-chop)+.12*er+.08*(100-rv*.35)),bear=Math.max(1,.28*(100-trend)+.16*(100-mom)+.18*adx+.18*(100-chop)+.12*er+.08*(100-rv*.35)),range=Math.max(1,.32*chop+.24*(100-adx)+.22*(100-er)+.12*(100-Math.abs(trend-50)*2)+.10*(100-rv*.45)),high=Math.max(1,.62*rv+.18*adx+.20*Math.min(100,(+q.atrPct||0)*18));
  const vals={TREND_UP:bull,TREND_DOWN:bear,RANGE:range,HIGH_VOL:high},sum=Object.values(vals).reduce((a,b)=>a+b,0);for(const k of Object.keys(vals))vals[k]=vals[k]/sum;
  const order=Object.entries(vals).sort((a,b)=>b[1]-a[1]);return {probs:vals,state:order[0][0],confidence:order[0][1],separation:order[0][1]-order[1][1]}
}
function regimeTransitionStats(){
  const rows=resolvedChronological(analysisSource()).map(x=>({...x,canon:canonicalRegime(x)})).filter(x=>x.canon),states=["TREND_UP","TREND_DOWN","RANGE","HIGH_VOL"],m={};for(const a of states){m[a]={};for(const b of states)m[a][b]=0}
  let transitions=0,run=0,cur=null;for(let i=0;i<rows.length;i++){const s=rows[i].canon;if(s===cur)run++;else{cur=s;run=1}if(i){m[rows[i-1].canon][s]++;transitions++}}
  let correct=0,predN=0,hist={};for(const a of states){hist[a]={};for(const b of states)hist[a][b]=0}
  for(let i=1;i<rows.length;i++){const prev=rows[i-1].canon,actual=rows[i].canon,total=Object.values(hist[prev]).reduce((a,b)=>a+b,0);if(total>=3){const pred=Object.entries(hist[prev]).sort((a,b)=>b[1]-a[1])[0][0];if(pred===actual)correct++;predN++}hist[prev][actual]++}
  const now=currentRegimeProbabilities(),state=now?.state||cur||"RANGE",row=m[state]||{},sum=Object.values(row).reduce((a,b)=>a+b,0),sorted=Object.entries(row).sort((a,b)=>b[1]-a[1]),next=sorted[0]?.[0]||state,nextP=sum?sorted[0][1]/sum:NaN;
  return {rows,states,m,transitions,currentRun:run,next,nextP,accuracy:predN?correct/predN:NaN,predN}
}
function renderRegimeV2(){
  const r=currentRegimeProbabilities();if(!r)return null;const tr=regimeTransitionStats();regimeV2State={...r,...tr,ts:Date.now()};
  $("regimeV2State").textContent=r.state;$("regimeBull").textContent=(r.probs.TREND_UP*100).toFixed(0)+"%";$("regimeBear").textContent=(r.probs.TREND_DOWN*100).toFixed(0)+"%";$("regimeRange").textContent=(r.probs.RANGE*100).toFixed(0)+"%";$("regimeHighVol").textContent=(r.probs.HIGH_VOL*100).toFixed(0)+"%";$("regimePersistence").textContent=`${tr.currentRun} obs`;$("regimeNext").textContent=tr.next;$("regimeNextP").textContent=Number.isFinite(tr.nextP)?(tr.nextP*100).toFixed(0)+"%":"—";$("regimeAccuracy").textContent=Number.isFinite(tr.accuracy)?(tr.accuracy*100).toFixed(0)+"%":"—";$("regimeN").textContent=tr.transitions;$("regimeSeparation").textContent=(r.separation*100).toFixed(0)+" pp";$("regimeConfidence").textContent=(r.confidence*100).toFixed(0)+"%";
  $("regimeMatrix").innerHTML=`<div class="diRow"><div class="diCell">From \\ To</div>${tr.states.map(x=>`<div class="diCell">${x}</div>`).join("")}<div class="diCell">N</div></div>`+tr.states.map(a=>{const n=Object.values(tr.m[a]).reduce((x,y)=>x+y,0);return `<div class="diRow"><div class="diCell">${a}</div>${tr.states.map(b=>`<div class="diCell">${n?(tr.m[a][b]/n*100).toFixed(0):"0"}%</div>`).join("")}<div class="diCell">${n}</div></div>`}).join("");
  return regimeV2State
}


function ensembleV2Config(){
  const val=(id,fallback)=>{const n=+$(`${id}`)?.value;return Number.isFinite(n)?n:fallback};
  return {threshold:Math.max(.50,Math.min(.80,val("ensV2Threshold",.55))),maxDisagreement:Math.max(.05,Math.min(.50,val("ensV2MaxDisagree",.18))),l1:Math.max(0,Math.min(.10,val("ensV2L1",.01))),stumps:Math.max(8,Math.min(60,Math.round(val("ensV2Stumps",24)))),split:Math.max(.55,Math.min(.85,val("ensV2Split",.72))),l2:.02}
}
function softThreshold(x,t){return x>t?x-t:x<-t?x+t:0}
function trainElasticNetLogistic(train,l1=.01,l2=.015,epochs=480,lr=.06){
  const n=train.length,p=train[0].vals.length,scale=normalizeTrain(train),w=Array(p+1).fill(0),sw=train.reduce((a,r)=>a+mlSampleWeight(r),0)||n;
  for(let ep=0;ep<epochs;ep++){
    const g=Array(p+1).fill(0);for(const r of train){const wt=mlSampleWeight(r),x=scale.norm(r.vals),z=w[0]+x.reduce((a,v,j)=>a+v*w[j+1],0),pr=mlSigmoid(z),e=(pr-r.label)*wt;g[0]+=e;for(let j=0;j<p;j++)g[j+1]+=e*x[j]}
    w[0]-=lr*g[0]/sw;for(let j=1;j<w.length;j++){const v=w[j]-lr*(g[j]/sw+l2*w[j]);w[j]=softThreshold(v,lr*l1)}
  }
  const baseRate=train.reduce((a,x)=>a+x.label*mlSampleWeight(x),0)/sw;return {kind:"ELASTIC_LOGISTIC",w,...scale,baseRate,predict(vals){const x=this.norm(vals),z=this.w[0]+x.reduce((a,v,j)=>a+v*this.w[j+1],0);return mlSigmoid(z)},contrib(vals){const x=this.norm(vals);return x.map((v,j)=>v*this.w[j+1])}}
}
function boostedStumpThresholds(train,j){
  const a=train.map(x=>x.vals[j]).filter(Number.isFinite).sort((x,y)=>x-y);if(a.length<12)return [];return [.2,.35,.5,.65,.8].map(q=>quantileSorted(a,q)).filter((x,i,z)=>Number.isFinite(x)&&(i===0||Math.abs(x-z[i-1])>1e-9))
}
function trainBoostedStumps(train,rounds=24,shrink=.22,minLeaf=7){
  const n=train.length,p=train[0].vals.length,sw=train.reduce((a,r)=>a+mlSampleWeight(r),0)||n,rate=clamp((train.reduce((a,x)=>a+x.label*mlSampleWeight(x),0)+1)/(sw+2),.02,.98),base=Math.log(rate/(1-rate)),scores=Array(n).fill(base),stumps=[];
  for(let r=0;r<rounds;r++){
    const probs=scores.map(mlSigmoid),res=train.map((x,i)=>(x.label-probs[i])*mlSampleWeight(x));let best=null;
    for(let j=0;j<p;j++)for(const threshold of boostedStumpThresholds(train,j)){
      const li=[],ri=[];for(let i=0;i<n;i++)(train[i].vals[j]<=threshold?li:ri).push(i);if(li.length<minLeaf||ri.length<minLeaf)continue;
      const leaf=ix=>{let num=0,den=0;for(const i of ix){const wt=mlSampleWeight(train[i]);num+=res[i];den+=probs[i]*(1-probs[i])*wt}return clamp(num/Math.max(.5,den),-1.5,1.5)};
      const left=leaf(li),right=leaf(ri);let gain=0;
      for(let i=0;i<n;i++){const wt=mlSampleWeight(train[i]),u=train[i].vals[j]<=threshold?left:right,g0=(train[i].label-probs[i])**2*wt,g1=(train[i].label-(probs[i]+shrink*u))**2*wt;gain+=g0-g1}
      if(!best||gain>best.gain)best={j,threshold,left:left*shrink,right:right*shrink,gain}
    }
    if(!best||best.gain<=1e-8)break;stumps.push(best);for(let i=0;i<n;i++)scores[i]+=train[i].vals[best.j]<=best.threshold?best.left:best.right
  }
  return {kind:"BOOSTED_STUMPS",base,baseRate:rate,stumps,predict(vals){let z=this.base;for(const s of this.stumps)z+=vals[s.j]<=s.threshold?s.left:s.right;return mlSigmoid(z)},contrib(vals){const c=Array(ML_FEATURES.length).fill(0);for(const s of this.stumps)c[s.j]+=vals[s.j]<=s.threshold?s.left:s.right;return c}}
}
function evalPredictions(pred,baseRate=NaN){
  const clean=pred.filter(x=>Number.isFinite(x.p)&&(x.y===0||x.y===1));if(!clean.length)return {n:0,auc:NaN,brier:NaN,skill:NaN,acc:NaN,expectancy:NaN,tradeN:0,state:"WEAK"};
  const brier=clean.reduce((a,x)=>a+(x.p-x.y)**2,0)/clean.length,base=Number.isFinite(+baseRate)?+baseRate:.5,baseB=clean.reduce((a,x)=>a+(base-x.y)**2,0)/clean.length,auc=aucMetric(clean),acc=clean.filter(x=>(x.p>=.5?1:0)===x.y).length/clean.length,skill=baseB?1-brier/baseB:NaN,trade=clean.filter(x=>x.p>=.55&&Number.isFinite(x.utility)),expectancy=trade.length?trade.reduce((a,x)=>a+x.utility,0)/trade.length:NaN,state=clean.length>=20&&auc>=.55&&skill>0&&trade.length>=8&&expectancy>0?"USABLE":"WEAK";return {n:clean.length,auc,brier,skill,acc,expectancy,tradeN:trade.length,state}
}
function ensembleProbabilityFromModels(models,vals){
  const predictions=models.map(x=>({name:x.name,p:x.model.predict(vals)})).filter(x=>Number.isFinite(x.p));if(!predictions.length)return {predictions,raw:NaN,range:NaN,sd:NaN};
  const raw=predictions.reduce((a,x)=>a+x.p,0)/predictions.length,range=Math.max(...predictions.map(x=>x.p))-Math.min(...predictions.map(x=>x.p)),sd=Math.sqrt(predictions.reduce((a,x)=>a+(x.p-raw)**2,0)/predictions.length);return {predictions,raw,range,sd}
}
function ensembleAdjustedProbability(raw,disagreement,maxDisagreement=.18){
  if(!Number.isFinite(raw)||!Number.isFinite(disagreement))return NaN;const pressure=clamp(disagreement/Math.max(.01,maxDisagreement),0,1.5),factor=clamp(1-.65*pressure,.20,1);return .5+(raw-.5)*factor
}
function serializeBoostedStumps(model){return model?{kind:"BOOSTED_STUMPS",base:model.base,baseRate:model.baseRate,stumps:model.stumps}:null}
function restoreBoostedStumps(p){if(!p||!Number.isFinite(+p.base)||!Array.isArray(p.stumps))return null;return {kind:"BOOSTED_STUMPS",base:+p.base,baseRate:Number.isFinite(+p.baseRate)?+p.baseRate:mlSigmoid(+p.base),stumps:p.stumps,predict(vals){let z=this.base;for(const s of this.stumps)z+=vals[s.j]<=s.threshold?s.left:s.right;return mlSigmoid(z)},contrib(vals){const c=Array(ML_FEATURES.length).fill(0);for(const s of this.stumps)c[s.j]+=vals[s.j]<=s.threshold?s.left:s.right;return c}}}
function serializeMetaEnsembleV2(x=metaEnsembleV2){
  if(!x?.models)return null;return {schemaVersion:54,type:"META_ENSEMBLE_V2",trainedAt:x.trainedAt,fingerprint:x.fingerprint,state:x.state,config:x.config,trainN:x.trainN,testN:x.testN,metrics:x.metrics,oosDisagreement:x.oosDisagreement,models:{ridge:{metrics:x.models.ridge.metrics,params:serializeModel(x.models.ridge.model)},elastic:{metrics:x.models.elastic.metrics,params:serializeModel(x.models.elastic.model)},stumps:{metrics:x.models.stumps.metrics,params:serializeBoostedStumps(x.models.stumps.model)}}}
}
function persistMetaEnsembleV2(){
  const data=serializeMetaEnsembleV2();if(!data)return false;if(appSettings().privacySessionOnly){privacySessionState.metaEnsemble=data;return true}localStorage.setItem(META_ENSEMBLE_V2_KEY,JSON.stringify(data));if(localDbSupported())localDbPutRecord("models",`META_ENSEMBLE_V2|${data.trainedAt}`,data,data.trainedAt).catch(()=>{});return true
}
function restoreMetaEnsembleV2(){
  try{
    const x=appSettings().privacySessionOnly?privacySessionState.metaEnsemble:JSON.parse(localStorage.getItem(META_ENSEMBLE_V2_KEY)||"null");if(!x?.models)return false;
    const ridge=modelFromParams(x.models.ridge?.params),elastic=modelFromParams(x.models.elastic?.params),stumps=restoreBoostedStumps(x.models.stumps?.params);if(!ridge||!elastic||!stumps)return false;
    const same=x.fingerprint===researchDatasetFingerprint(),state=same?x.state:"STALE DATASET";
    metaEnsembleV2={...x,state,models:{ridge:{model:ridge,metrics:x.models.ridge.metrics},elastic:{model:elastic,metrics:x.models.elastic.metrics},stumps:{model:stumps,metrics:x.models.stumps.metrics}}};if(localDbSupported())localDbPutRecord("models",`META_ENSEMBLE_V2|${x.trainedAt||Date.now()}`,x,x.trainedAt||Date.now()).catch(()=>{});return true
  }catch{return false}
}
function ensembleCurrentPrediction(){
  const cur=currentMlFeatureRow(),x=metaEnsembleV2;if(!cur||!x?.models)return {action:"NO MODEL",p:NaN,raw:NaN,disagreement:NaN,state:x?.state||"LEARNING",predictions:[]};
  const fresh=x.fingerprint===researchDatasetFingerprint(),state=fresh?x.state:"STALE DATASET",models=[{name:"L2 Logistic",model:x.models.ridge.model},{name:"Elastic-Net",model:x.models.elastic.model},{name:"Boosted Stumps",model:x.models.stumps.model}],e=ensembleProbabilityFromModels(models,cur.vals),cfg=x.config||ensembleV2Config(),p=ensembleAdjustedProbability(e.raw,e.range,cfg.maxDisagreement),strict=state==="USABLE ENSEMBLE",agree=Number.isFinite(e.range)&&e.range<=cfg.maxDisagreement,action=strict&&agree&&p>=cfg.threshold?"TRADE":"SKIP";
  return {action,p,raw:e.raw,disagreement:e.range,sd:e.sd,state,predictions:e.predictions,agree,strict,fresh}
}
async function trainMetaEnsembleV2(showToast=false){
  const data=mlDataset(),n=data.length,cfg=ensembleV2Config();if(n<90){metaEnsembleV2={state:"LEARNING",trainN:0,testN:0,config:cfg,fingerprint:researchDatasetFingerprint()};renderMetaEnsembleV2();if(showToast)toast(`Need at least 90 resolved outcomes · current ${n}`,"warn");return metaEnsembleV2}
  const cut=Math.max(60,Math.min(n-20,Math.floor(n*cfg.split))),train=data.slice(0,cut),test=data.slice(cut);if(showToast)toast("Training Ensemble v2 in research worker…","good");
  const [ridge,elastic,stumps]=await Promise.all([trainLogisticOffMain(train,cfg.l2),trainElasticOffMain(train,cfg.l1,.015),trainStumpsOffMain(train,cfg.stumps)]),models={ridge:{model:ridge,metrics:modelEval(ridge,test)},elastic:{model:elastic,metrics:modelEval(elastic,test)},stumps:{model:stumps,metrics:modelEval(stumps,test)}};
  const named=[["ridge",models.ridge],["elastic",models.elastic],["stumps",models.stumps]],pred=test.map(r=>{const e=ensembleProbabilityFromModels(named.map(([name,x])=>({name,model:x.model})),r.vals);return {p:e.raw,y:r.label,range:e.range,utility:r.utility}}),baseRate=train.reduce((a,x)=>a+x.label*mlSampleWeight(x),0)/(train.reduce((a,x)=>a+mlSampleWeight(x),0)||train.length),metrics=evalPredictions(pred,baseRate),allPass=named.every(([,x])=>x.metrics.state==="USABLE"),state=allPass&&metrics.state==="USABLE"?"USABLE ENSEMBLE":"RESEARCH ONLY",ranges=pred.map(x=>x.range).filter(Number.isFinite),oosDisagreement={mean:ranges.length?ranges.reduce((a,b)=>a+b,0)/ranges.length:NaN,p90:ranges.length?quantileSorted(ranges,.90):NaN};
  metaEnsembleV2={models,metrics,state,trainN:train.length,testN:test.length,trainedAt:Date.now(),fingerprint:researchDatasetFingerprint(),config:cfg,oosDisagreement};persistMetaEnsembleV2();renderMetaEnsembleV2();renderMetaLabel();renderMasterVerdict();if(showToast)toast(`Ensemble v2: ${state} · ${named.filter(([,x])=>x.metrics.state==="USABLE").length}/3 models pass OOS`,state==="USABLE ENSEMBLE"?"good":"warn");return metaEnsembleV2
}
function renderMetaEnsembleV2(){
  const x=metaEnsembleV2,d=ensembleCurrentPrediction();if(!$("ensV2State"))return;
  const cfg=x?.config||ensembleV2Config();if($("ensV2Threshold"))$("ensV2Threshold").value=cfg.threshold;if($("ensV2MaxDisagree"))$("ensV2MaxDisagree").value=cfg.maxDisagreement;if($("ensV2L1"))$("ensV2L1").value=cfg.l1;if($("ensV2Stumps"))$("ensV2Stumps").value=cfg.stumps;if($("ensV2Split"))$("ensV2Split").value=cfg.split;
  $("ensV2Fingerprint").textContent=x?.fingerprint||researchDatasetFingerprint();$("ensV2Action").textContent=d.action;$("ensV2Action").className=d.action==="TRADE"?"ensUsable":d.action==="SKIP"?"ensSkip":"ensWeak";$("ensV2Prob").textContent=Number.isFinite(d.p)?(d.p*100).toFixed(1)+"%":"—";$("ensV2Raw").textContent=Number.isFinite(d.raw)?(d.raw*100).toFixed(1)+"%":"—";$("ensV2Disagree").textContent=Number.isFinite(d.disagreement)?(d.disagreement*100).toFixed(1)+" pp":"—";$("ensV2DisagreeBar").style.width=Number.isFinite(d.disagreement)?Math.min(100,d.disagreement/Math.max(.01,cfg.maxDisagreement)*100)+"%":"0%";$("ensV2Auc").textContent=Number.isFinite(x?.metrics?.auc)?x.metrics.auc.toFixed(3):"—";$("ensV2Skill").textContent=Number.isFinite(x?.metrics?.skill)?(x.metrics.skill*100).toFixed(1)+"%":"—";$("ensV2N").textContent=x?`${x.trainN||0}/${x.testN||0}`:"—";const pass=x?.models?Object.values(x.models).filter(z=>z.metrics?.state==="USABLE").length:0;$("ensV2ModelsPass").textContent=x?`${pass}/3`:"—";$("ensV2OosDisagree").textContent=Number.isFinite(x?.oosDisagreement?.mean)?(x.oosDisagreement.mean*100).toFixed(1)+" pp":"—";$("ensV2OosP90").textContent=Number.isFinite(x?.oosDisagreement?.p90)?(x.oosDisagreement.p90*100).toFixed(1)+" pp":"—";$("ensV2State").textContent=d.state||"LEARNING";$("ensV2State").className=d.state==="USABLE ENSEMBLE"?"ensUsable":d.state==="RESEARCH ONLY"||d.state==="STALE DATASET"?"ensWeak":"neutral";$("ensV2Stored").textContent=(appSettings().privacySessionOnly?!!privacySessionState.metaEnsemble:!!localStorage.getItem(META_ENSEMBLE_V2_KEY))?"YES · "+(appSettings().privacySessionOnly?"SESSION":"LOCAL"):"NO";
  const rows=x?.models?[["L2 Logistic (ridge-style)",x.models.ridge],["Elastic-Net Logistic",x.models.elastic],["Boosted Stumps",x.models.stumps]]:[];$("ensV2Models").innerHTML=rows.length?`<div class="ensRow"><div class="ensCell">Model</div><div class="ensCell">OOS AUC</div><div class="ensCell">Brier</div><div class="ensCell">Brier skill</div><div class="ensCell">Accuracy</div><div class="ensCell">Gate</div></div>`+rows.map(([name,z])=>`<div class="ensRow"><div class="ensCell">${name}</div><div class="ensCell">${Number.isFinite(z.metrics?.auc)?z.metrics.auc.toFixed(3):"—"}</div><div class="ensCell">${Number.isFinite(z.metrics?.brier)?z.metrics.brier.toFixed(3):"—"}</div><div class="ensCell">${Number.isFinite(z.metrics?.skill)?(z.metrics.skill*100).toFixed(1)+"%":"—"}</div><div class="ensCell">${Number.isFinite(z.metrics?.acc)?(z.metrics.acc*100).toFixed(1)+"%":"—"}</div><div class="ensCell ${z.metrics?.state==="USABLE"?"ensUsable":"ensWeak"}">${z.metrics?.state||"—"}</div></div>`).join(""):'<div class="emptyState">Train ensemble v2 after enough resolved outcomes.</div>';
  $("ensV2Current").innerHTML=d.predictions?.length?`<div class="ensRow"><div class="ensCell">Current prediction</div>${d.predictions.map(z=>`<div class="ensCell">${z.name}: ${(z.p*100).toFixed(1)}%</div>`).join("")}<div class="ensCell">raw ${(d.raw*100).toFixed(1)}%</div><div class="ensCell">adjusted ${(d.p*100).toFixed(1)}%</div></div>`:"";
  $("ensV2Note").textContent=d.state==="USABLE ENSEMBLE"?`Strict OOS gate passed. Current TRADE requires adjusted probability ≥ ${(cfg.threshold*100).toFixed(0)}% and disagreement ≤ ${(cfg.maxDisagreement*100).toFixed(0)} pp. Equal model weights are fixed, not tuned on OOS.`:d.state==="STALE DATASET"?"Stored ensemble fingerprint differs from the current resolved dataset. Retrain before it can gate TRADE.":"Research only until all three component models and the equal-weight ensemble pass OOS AUC/Brier-skill gates."
}
async function trainMetaLabelModel(){
  const data=mlDataset(),n=data.length;if(n<70){metaLabelState={state:"LEARNING",n};renderMetaLabel();return metaLabelState}
  const cut=Math.max(45,Math.min(n-20,Math.floor(n*.72))),train=data.slice(0,cut),test=data.slice(cut),model=await trainLogisticOffMain(train,.02),metrics=modelEval(model,test),usable=metrics.state==="USABLE",state=usable?"USABLE":"WEAK OOS";
  metaLabelState={model,metrics,trainN:train.length,testN:test.length,state,trainedAt:Date.now(),fingerprint:researchDatasetFingerprint()};autoVersionModel("META",metaLabelState);renderMetaLabel();renderMasterVerdict();return metaLabelState
}
function currentMetaDecision(){
  const ss=window.__signalState;if(!ss||ss.tm.direction==="WAIT")return {action:"SKIP",p:NaN,state:metaEnsembleV2?.state||metaLabelState?.state||"NO MODEL"};
  if(metaEnsembleV2?.models)return ensembleCurrentPrediction();
  const cur=currentMlFeatureRow();if(!metaLabelState?.model||!cur)return {action:"NO MODEL",p:NaN,state:"LEARNING"};
  const p=metaLabelState.model.predict(cur.vals),action=metaLabelState.state==="USABLE"&&p>=.55?"TRADE":"SKIP";return {action,p,state:metaLabelState.state,disagreement:NaN}
}
function renderMetaLabel(){
  const d=currentMetaDecision(),m=metaEnsembleV2?.models?metaEnsembleV2:metaLabelState;$("metaAction").textContent=d.action;$("metaAction").className=d.action==="TRADE"?"good":d.action==="SKIP"?"bad":"neutral";$("metaProb").textContent=Number.isFinite(d.p)?(d.p*100).toFixed(0)+"%":"—";$("metaAuc").textContent=Number.isFinite(m?.metrics?.auc)?m.metrics.auc.toFixed(3):"—";$("metaSkill").textContent=Number.isFinite(m?.metrics?.skill)?(m.metrics.skill*100).toFixed(1)+"%":"—";$("metaN").textContent=m?`${m.trainN||0}/${m.testN||0}`:"—";$("metaState").textContent=d.state||m?.state||"LEARNING";$("metaNote").textContent=metaEnsembleV2?.models?(d.action==="TRADE"?"Ensemble v2 supports TRADE after strict OOS and disagreement gates.":`Ensemble v2 says SKIP · ${Number.isFinite(d.disagreement)?(d.disagreement*100).toFixed(1)+" pp disagreement · ":""}direction still comes only from the base engine.`):(d.action==="TRADE"?"Meta model supports taking the current base setup.":d.action==="SKIP"?"Meta model advises skipping the current base setup.":"Train after enough resolved setups. Direction still comes only from the base engine.")
}

function weightedCalibration(rows,halfLife=60){
  if(!rows.length)return {n:0,p:NaN,raw:NaN,brier:NaN,over:NaN};let sw=0,sy=0,sp=0,b=0;const n=rows.length;
  rows.forEach((x,i)=>{const age=n-1-i,w=Math.pow(.5,age/halfLife),p=confidenceOfRow(x),y=x.r>0?1:0;sw+=w;sy+=w*y;sp+=w*p;b+=w*(p-y)**2});
  const raw=sp/sw,obs=sy/sw,shrink=(sy+5)/(sw+10);return {n,raw,p:shrink,brier:b/sw,over:raw-obs}
}
function calibrationV2(){
  const st=window.__radarState,ss=window.__signalState;if(!st||!ss)return null;const all=resolvedChronological(analysisSource()),market=assetClass(),tf=st.tf,reg=canonicalRegime(st.q),exact=all.filter(x=>(x.market||"CRYPTO")===market&&x.tf===tf&&canonicalRegime(x)===reg),tfReg=all.filter(x=>x.tf===tf&&canonicalRegime(x)===reg),global=all.filter(x=>(x.market||"CRYPTO")===market),e=weightedCalibration(exact,45),t=weightedCalibration(tfReg,60),g=weightedCalibration(global,90),raw=Math.max(ss.sm.long,ss.sm.short)/100,parts=[];if(Number.isFinite(e.p))parts.push([e.p,Math.min(1,e.n/25)*.5]);if(Number.isFinite(t.p))parts.push([t.p,Math.min(1,t.n/40)*.3]);if(Number.isFinite(g.p))parts.push([g.p,.2]);let p=raw;if(parts.length){const sw=parts.reduce((a,x)=>a+x[1],0);p=parts.reduce((a,x)=>a+x[0]*x[1],0)/sw}
  const recent=global.slice(-30),prior=global.slice(-60,-30),rb=weightedCalibration(recent,30),pb=weightedCalibration(prior,30),state=exact.length>=30&&Math.abs(e.over)<=.08?"CALIBRATED":exact.length>=20?"WATCH":"LOW EVIDENCE";return {market,tf,reg,raw,p,exact:e,tfReg:t,global:g,rollingBrier:rb.brier,priorBrier:pb.brier,state}
}
function renderCalibrationV2(){
  const c=calibrationV2();if(!c)return null;calibrationV2State=c;$("calV2Raw").textContent=(c.raw*100).toFixed(0)+"%";$("calV2Prob").textContent=(c.p*100).toFixed(0)+"%";$("calV2N").textContent=c.exact.n;$("calV2Brier").textContent=Number.isFinite(c.rollingBrier)?c.rollingBrier.toFixed(3):"—";$("calV2Over").textContent=Number.isFinite(c.exact.over)?((c.exact.over*100>=0?"+":"")+(c.exact.over*100).toFixed(1)+" pp"):"—";$("calV2State").textContent=c.state;
  const rows=[["Exact market+TF+regime",c.exact],["TF+regime",c.tfReg],["Market global",c.global]];$("calV2Table").innerHTML=`<div class="diRow"><div class="diCell">Scope</div><div class="diCell">N</div><div class="diCell">Raw</div><div class="diCell">Calibrated</div><div class="diCell">Brier</div><div class="diCell">Overconfidence</div></div>`+rows.map(([n,x])=>`<div class="diRow"><div class="diCell">${n}</div><div class="diCell">${x.n}</div><div class="diCell">${Number.isFinite(x.raw)?(x.raw*100).toFixed(0)+"%":"—"}</div><div class="diCell">${Number.isFinite(x.p)?(x.p*100).toFixed(0)+"%":"—"}</div><div class="diCell">${Number.isFinite(x.brier)?x.brier.toFixed(3):"—"}</div><div class="diCell">${Number.isFinite(x.over)?(x.over*100).toFixed(1)+" pp":"—"}</div></div>`).join("");return c
}

function loadTrueFlowHistory(sym){
  if(appSettings().privacySessionOnly){const a=privacySessionState.trueFlow[sym];return Array.isArray(a)?a:[]}try{const db=JSON.parse(localStorage.getItem(TRUE_FLOW_HISTORY_KEY)||"{}"),a=db[sym];return Array.isArray(a)?a:[]}catch{return []}
}
function saveTrueFlowHistory(sym,rows){
  if(appSettings().privacySessionOnly){privacySessionState.trueFlow[sym]=rows.slice(-4000);const keys=Object.keys(privacySessionState.trueFlow);if(keys.length>6)for(const k of keys.slice(0,keys.length-6))delete privacySessionState.trueFlow[k];return}try{const db=JSON.parse(localStorage.getItem(TRUE_FLOW_HISTORY_KEY)||"{}");db[sym]=rows.slice(-4000);const keys=Object.keys(db);if(keys.length>6)for(const k of keys.slice(0,keys.length-6))delete db[k];localStorage.setItem(TRUE_FLOW_HISTORY_KEY,JSON.stringify(db))}catch{}
}
function mergeTrueFlowHistory(sym,rows){
  const prior=loadTrueFlowHistory(sym),m=new Map();for(const x of prior)m.set(x.id,x);for(const x of rows)m.set(x.id,x);const out=[...m.values()].sort((a,b)=>a.t-b.t).slice(-4000);saveTrueFlowHistory(sym,out);if(!appSettings().privacySessionOnly)localDbPutMany("trade_flow",out.slice(-1000),x=>`${sym}|${x.id}`,x=>x.t).catch(()=>{});return out
}
async function loadTrueTradeFlow(force=false){
  if(assetClass()!=="CRYPTO"){trueFlowState=null;return null}const sym=norm($("symbol").value),req=currentDecisionIdentity(sym),key=cacheKey("true-flow",sym),windowMs=15*60*1000,endTs=Date.now(),startTs=endTs-windowMs;
  try{
    const fresh=await memoRequest(key,force?1:15000,async()=>{let out=[],page=0,fromId=null;while(page<12){const path=fromId==null?`/aggTrades?symbol=${encodeURIComponent(sym)}&startTime=${startTs}&endTime=${endTs}&limit=1000`:`/aggTrades?symbol=${encodeURIComponent(sym)}&fromId=${fromId}&limit=1000`,rows=await market(path);if(!Array.isArray(rows)||!rows.length)break;const z=rows.map(x=>({id:+x.a,p:+x.p,q:+x.q,m:!!x.m,t:+x.T,n:(+x.p)*(+x.q)})).filter(x=>Number.isFinite(x.id)&&x.n>0&&x.t>=startTs&&x.t<=endTs);out.push(...z);page++;const last=rows.at(-1);if(rows.length<1000||!last||+last.T>=endTs)break;fromId=+last.a+1}const m=new Map();for(const x of out)m.set(x.id,x);return [...m.values()].sort((a,b)=>a.t-b.t)});
    if(!requestIdentityStillCurrent(req,{ignoreTf:true}))return null;if(!fresh.length)throw Error("No aggTrades in requested 15m window");const trades=fresh,notionals=trades.map(x=>x.n).sort((a,b)=>a-b),largeCut=quantileSorted(notionals,.90),buy=trades.filter(x=>!x.m).reduce((a,x)=>a+x.n,0),sell=trades.filter(x=>x.m).reduce((a,x)=>a+x.n,0),cvd=buy-sell,total=buy+sell,delta=total?cvd/total*100:0,largeBuy=trades.filter(x=>!x.m&&x.n>=largeCut).reduce((a,x)=>a+x.n,0),largeSell=trades.filter(x=>x.m&&x.n>=largeCut).reduce((a,x)=>a+x.n,0),p0=trades[0].p,p1=trades.at(-1).p,priceCh=p0?(p1/p0-1)*100:0,div=delta>8&&priceCh<-.05?"BULL CVD DIVERGENCE":delta<-8&&priceCh>.05?"BEAR CVD DIVERGENCE":"NONE",state=delta>=10?"BUY DOMINANT":delta<=-10?"SELL DOMINANT":"BALANCED",coverageMs=Math.max(0,trades.at(-1).t-trades[0].t),startCovered=trades[0].t<=startTs+90000,endCovered=trades.at(-1).t>=endTs-90000,coverage=Math.min(1,coverageMs/windowMs)*(startCovered?1:.85)*(endCovered?1:.85);
    mergeTrueFlowHistory(sym,trades);trueFlowState=stampDecisionState({market:"CRYPTO",source:req.source,symbol:sym,n:trades.length,buy,sell,cvd,delta,largeDelta:largeBuy-largeSell,priceCh,div,state,start:trades[0].t,end:trades.at(-1).t,coverageMs,coverage,startCovered,endCovered,requestedWindowMs:windowMs,ts:Date.now()},req);renderTrueTradeFlow();renderMasterVerdict();return trueFlowState
  }catch(e){if(!requestIdentityStillCurrent(req,{ignoreTf:true}))return null;trueFlowState=stampDecisionState({market:"CRYPTO",source:req.source,symbol:sym,error:e.message,ts:Date.now()},req);renderTrueTradeFlow();return null}
}
function renderTrueTradeFlow(){
  const f=trueFlowState;if(!f||f.error){for(const id of ["trueFlowN","trueFlowBuy","trueFlowSell","trueFlowCvd","trueFlowDelta","trueFlowState","trueFlowLarge","trueFlowPrice","trueFlowDiv","trueFlowStart","trueFlowEnd"])if($(id))$(id).textContent=f?.error?"N/A":"—";return}
  $("trueFlowN").textContent=f.n;$("trueFlowBuy").textContent=compact(f.buy);$("trueFlowSell").textContent=compact(f.sell);$("trueFlowCvd").textContent=(f.cvd>=0?"+":"")+compact(f.cvd);$("trueFlowDelta").textContent=(f.delta>=0?"+":"")+f.delta.toFixed(1)+"%";$("trueFlowState").textContent=f.state;$("trueFlowLarge").textContent=(f.largeDelta>=0?"+":"")+compact(f.largeDelta);$("trueFlowPrice").textContent=(f.priceCh>=0?"+":"")+f.priceCh.toFixed(2)+"%";$("trueFlowDiv").textContent=f.div;$("trueFlowStart").textContent=new Date(f.start).toLocaleTimeString();$("trueFlowEnd").textContent=new Date(f.end).toLocaleTimeString()
}

function restoreObservedLiquidations(){if(appSettings().privacySessionOnly)return;try{const a=JSON.parse(localStorage.getItem(LIQ_HISTORY_KEY)||"[]");if(Array.isArray(a))liqEvents=[...a,...liqEvents].sort((a,b)=>a.ts-b.ts).slice(-2500)}catch{}}
function persistObservedLiquidations(){
  if(appSettings().privacySessionOnly)return;try{localStorage.setItem(LIQ_HISTORY_KEY,JSON.stringify(liqEvents.filter(x=>x.ts>=Date.now()-7*86400000).slice(-2500)))}catch{}
  if(Date.now()-lastLiqDbArchiveTs>30000){lastLiqDbArchiveTs=Date.now();localDbPutMany("liquidations",liqEvents.slice(-250),x=>`${x.ts}|${x.symbol}|${x.price}|${x.side}`,x=>x.ts).catch(()=>{})}
}
function ensureLiquidationTape(){if(assetClass()!=="CRYPTO")return;if(liqSocket&&[0,1].includes(liqSocket.readyState))return;startLiquidationTape()}
function observedLiquidationHeatmap(){
  const sym=norm($("symbol").value),rows=liqEvents.filter(x=>x.symbol===sym&&x.ts>=Date.now()-7*86400000);if(!rows.length)return {rows:[],bins:[],long:0,short:0};
  const lo=Math.min(...rows.map(x=>x.price)),hi=Math.max(...rows.map(x=>x.price)),binsN=16,step=(hi-lo||Math.max(1,lo*.002))/binsN,bins=Array.from({length:binsN},(_,i)=>({lo:lo+i*step,hi:lo+(i+1)*step,long:0,short:0,total:0,count:0}));
  for(const x of rows){const idx=Math.min(binsN-1,Math.max(0,Math.floor((x.price-lo)/(step||1)))),b=bins[idx];b[x.liquidated==="LONG"?"long":"short"]+=x.notional;b.total+=x.notional;b.count++}
  return {rows,bins,long:rows.filter(x=>x.liquidated==="LONG").reduce((a,x)=>a+x.notional,0),short:rows.filter(x=>x.liquidated==="SHORT").reduce((a,x)=>a+x.notional,0)}
}
function renderObservedLiquidationHeatmap(){
  const h=observedLiquidationHeatmap(),peak=[...h.bins].sort((a,b)=>b.total-a.total)[0],max=Math.max(1,...h.bins.map(x=>x.total));$("heatLiqN").textContent=h.rows.length;$("heatLong").textContent=compact(h.long);$("heatShort").textContent=compact(h.short);$("heatPeak").textContent=peak&&peak.total?`${num((peak.lo+peak.hi)/2)} · ${compact(peak.total)}`:"—";$("heatSide").textContent=h.long>h.short*1.15?"LONG LIQUIDATIONS":h.short>h.long*1.15?"SHORT LIQUIDATIONS":"BALANCED";
  $("liqHeatmap").innerHTML=h.bins.length?`<div class="heatRow"><div class="heatCell">Price zone</div><div class="heatCell">Long liq.</div><div class="heatCell">Short liq.</div><div class="heatCell">Observed density</div></div>`+h.bins.slice().reverse().map(b=>`<div class="heatRow"><div class="heatCell">${num(b.lo)}–${num(b.hi)}</div><div class="heatCell">${compact(b.long)}</div><div class="heatCell">${compact(b.short)}</div><div class="heatCell"><div class="heatBar"><i style="width:${100*b.total/max}%;background:${b.long>b.short?"#ff7f8a":"#6ee7ad"}"></i></div></div></div>`).join(""):'<div class="emptyState">No stored liquidation events for the selected symbol yet.</div>';renderMasterVerdict();return h
}

function researchDatasetFingerprint(){
  const rows=resolvedChronological(analysisSource()),last=rows.at(-1);return `${analysisSource()}|${assetClass()}|N${rows.length}|${last?.ts||0}`
}
function serializeModel(model){if(!model)return null;return {w:model.w,mean:model.mean,sd:model.sd,baseRate:model.baseRate}}
function modelFromParams(p){if(!p?.w||!p?.mean||!p?.sd)return null;return {w:p.w,mean:p.mean,sd:p.sd,baseRate:Number.isFinite(+p.baseRate)?+p.baseRate:.5,norm(vals){return vals.map((x,j)=>(x-this.mean[j])/this.sd[j])},predict(vals){const x=this.norm(vals),z=this.w[0]+x.reduce((a,v,j)=>a+v*this.w[j+1],0);return mlSigmoid(z)},contrib(vals){const x=this.norm(vals);return x.map((v,j)=>v*this.w[j+1])}}}
function modelVersions(){if(appSettings().privacySessionOnly)return privacySessionState.models;try{return JSON.parse(localStorage.getItem(MODEL_VERSION_KEY)||"[]")}catch{return []}}
function setModelVersions(a){const rows=a.slice(0,40);if(appSettings().privacySessionOnly)privacySessionState.models=rows;else{archiveModelRows(a).catch(()=>{});localStorage.setItem(MODEL_VERSION_KEY,JSON.stringify(rows))}renderModelVersions()}
function autoVersionModel(type,state){
  if(!state?.model||!state.fingerprint)return;const a=modelVersions(),key=`${type}|${state.fingerprint}|${JSON.stringify(state.model.w).slice(0,120)}`;if(a.some(x=>x.key===key))return;
  a.unshift({id:Date.now(),type,key,created:Date.now(),fingerprint:state.fingerprint,state:state.state,metrics:state.metrics||{},params:serializeModel(state.model)});setModelVersions(a)
}
function saveCurrentModelVersion(){
  const type=metaLabelState?.model?"META":mlShadow?.model?"SHADOW":null,state=type==="META"?metaLabelState:mlShadow;if(!type||!state?.model){toast("Train a Shadow or Meta model first.","warn");return}
  const a=modelVersions(),id=Date.now();a.unshift({id,type,key:`manual|${id}`,created:Date.now(),fingerprint:researchDatasetFingerprint(),state:state.state,metrics:state.metrics||{auc:state.auc,brier:state.brier,skill:state.skill},params:serializeModel(state.model)});setModelVersions(a);toast("Research model version saved.","good")
}
function activateModelVersion(id){
  const x=modelVersions().find(v=>v.id===id);if(!x)return;const model=modelFromParams(x.params);if(!model)return;
  activeModelVersionId=id;if(appSettings().privacySessionOnly)privacySessionState.activeModelId=id;else localStorage.setItem(ACTIVE_MODEL_VERSION_KEY,String(id));if(x.type==="META")metaLabelState={model,state:x.state||"RESTORED",metrics:x.metrics||{},fingerprint:x.fingerprint,trainN:0,testN:0};else mlShadow={model,state:x.state||"RESTORED",auc:x.metrics?.auc,brier:x.metrics?.brier,skill:x.metrics?.skill,acc:x.metrics?.acc,trainN:0,testN:0};renderModelVersions();renderMetaLabel();renderMlLens();renderMasterVerdict();toast("Research model version activated. Base engine unchanged.","good")
}
function restoreActiveModelVersion(){
  const id=+(appSettings().privacySessionOnly?privacySessionState.activeModelId:localStorage.getItem(ACTIVE_MODEL_VERSION_KEY));if(!id)return false;const x=modelVersions().find(v=>v.id===id);if(!x?.params)return false;const model=modelFromParams(x.params);if(!model)return false;activeModelVersionId=id;if(x.type==="META")metaLabelState={model,state:x.state||"RESTORED",metrics:x.metrics||{},fingerprint:x.fingerprint,trainN:0,testN:0};else mlShadow={model,state:x.state||"RESTORED",auc:x.metrics?.auc,brier:x.metrics?.brier,skill:x.metrics?.skill,acc:x.metrics?.acc,trainN:0,testN:0};return true
}
function renderModelVersions(){
  const a=modelVersions();$("modelVersionN").textContent=a.length;$("modelVersionActive").textContent=activeModelVersionId?String(activeModelVersionId).slice(-6):"CURRENT";$("modelFingerprint").textContent=researchDatasetFingerprint();$("modelShadowState").textContent=mlShadow?.state||"—";$("modelMetaState").textContent=metaEnsembleV2?.state||metaLabelState?.state||"—";
  $("modelVersionTable").innerHTML=a.length?`<div class="modelVersionRow"><div class="diCell">ID</div><div class="diCell">Type</div><div class="diCell">State</div><div class="diCell">AUC</div><div class="diCell">Dataset</div><div class="diCell">Action</div></div>`+a.slice(0,20).map(x=>`<div class="modelVersionRow"><div class="diCell">${String(x.id).slice(-6)}</div><div class="diCell">${escapeHtml(x.type)}</div><div class="diCell">${escapeHtml(x.state||"—")}</div><div class="diCell">${Number.isFinite(+x.metrics?.auc)?(+x.metrics.auc).toFixed(3):"—"}</div><div class="diCell">${escapeHtml(x.fingerprint)}</div><div class="diCell"><button data-action-click="activateModelVersion(${x.id})">Activate research</button></div></div>`).join(""):'<div class="emptyState">No saved model versions.</div>'
}

function verdictChip(text,type=""){return `<span class="reasonChip ${type}">${text}</span>`}
function masterDataQuality(){
  const now=Date.now(),st=window.__radarState,ss=window.__signalState,fresh=now-(dataFresh.rest||0),market=assetClass(),base=st?(fresh<=60000?100:fresh<=120000?80:fresh<=300000?55:25):0,source=st&&st.source===analysisSource()?100:0,mtfCoverage=Number(ss?.mc?.coverage??st?.m?.coverage??((st?.m?.length||0)/4)),mtf=clamp(mtfCoverage*100,0,100),identity=st&&decisionIdentityKey(currentDecisionIdentity(st.symbol,st.source,st.tf))===activeDecisionIdentityKey?100:35;
  let flow=100,flowDetail="N/A";if(market==="CRYPTO"){if(trueFlowState?.error){flow=45;flowDetail="ERROR"}else if(trueFlowState&&decisionStateMatches(trueFlowState,{source:false,maxAge:10*60*1000})){const mins=(+trueFlowState.coverageMs||0)/60000,cov=Number(trueFlowState.coverage);flow=Number.isFinite(cov)?clamp(cov*100,0,100):(mins>=15?100:mins>=5?80:mins>=2?60:40);flowDetail=`${mins.toFixed(1)}m · ${Number.isFinite(cov)?(cov*100).toFixed(0)+"%":"?"}`}else{flow=60;flowDetail="PENDING"}}
  const ext=externalIntelState||{},cvd=decisionStateMatches(ext.histCvd,{source:false,maxAge:15*60*1000})?ext.histCvd:null,cvdQ=cvd?.available?clamp((+cvd.coverage||0)*100,0,100):100,ctxChecks=[window.__intelContext,ext.onchain,ext.predLiq,ext.options].filter(Boolean),ctxFresh=ctxChecks.length?ctxChecks.filter(x=>decisionStateMatches(x,{source:false,maxAge:15*60*1000})).length/ctxChecks.length*100:100,modelState=metaEnsembleV2?.models?(ensembleCurrentPrediction()?.state==="STALE DATASET"?55:100):90;
  const stockGuard=market==="STOCKS"?stockCorporateActionGuards.get(`${stockSymbol(st?.symbol||$("symbol")?.value)}|${st?.tf||$("tf")?.value}`):null;let q=.30*base+.15*source+.25*mtf+.15*identity+.07*flow+.04*cvdQ+.02*ctxFresh+.02*modelState;
  const caps=[];if(stockGuard?.guarded)caps.push(70);if(mtfCoverage<.75)caps.push(70);if(!st||source<100||identity<100)caps.push(50);if(cvd?.available&&cvdQ<75)caps.push(80);if(fresh>300000)caps.push(55);if(caps.length)q=Math.min(q,...caps);q=clamp(q);
  window.__dataQualityMatrix={score:q,base,source,mtf,mtfCoverage,identity,flow,flowDetail,cvd:cvdQ,context:ctxFresh,model:modelState,corporateActionGuard:stockGuard||null,freshMs:fresh,ts:now};return q
}

function vcBiasLabel(bias,available=true){
  if(!available||!Number.isFinite(bias))return "NEUTRAL";
  return bias>=.15?"BULLISH":bias<=-.15?"BEARISH":"NEUTRAL"
}
function vcSafe(fn,fallback=null){try{return fn()}catch{return fallback}}
function vcItem(name,family,bias,value,note="",opts={}){
  const available=opts.available!==false&&(Number.isFinite(bias)||opts.nondirectional===true),severity=opts.severity||null,category=severity?"BLOCKER":vcBiasLabel(bias,available),strength=Number.isFinite(bias)?Math.min(100,Math.abs(bias)*100):0;
  return {name,family,category,bias:Number.isFinite(bias)?clamp(bias,-1,1):NaN,strength,weight:+opts.weight||0,value:String(value??"—"),note:String(note||""),available,severity,directional:opts.nondirectional?false:available&&Number.isFinite(bias)}
}
function vcStatusItem(name,family,value,note="",opts={}){
  return vcItem(name,family,NaN,value,note,{...opts,nondirectional:true,available:opts.available!==false})
}
function vcScoreBias(v){return Number.isFinite(+v)?clamp((+v-50)/50,-1,1):NaN}
function vcBoolBias(v){return v===true?1:v===false?-1:NaN}
function vcTextBias(v,bull,bear){
  const x=String(v||"").toUpperCase();if(bull.some(k=>x.includes(k)))return 1;if(bear.some(k=>x.includes(k)))return -1;return 0
}
function buildVerdictCenterSnapshot(){
  const st=window.__radarState,ss=window.__signalState;if(!st||!ss)return {modules:[],agreement:NaN,coverage:0,consensus:"NO DATA",conviction:0,counts:{bullish:0,bearish:0,neutral:0,blocker:0,hard:0,warn:0},families:{},ts:Date.now()};
  const q=st.q||{},dir=ss.tm?.direction==="LONG"?1:ss.tm?.direction==="SHORT"?-1:0,mods=[],add=x=>mods.push(x),crypto=assetClass()==="CRYPTO",reg=regimeV2State||vcSafe(()=>renderRegimeV2()),meta=currentMetaDecision(),cal=calibrationV2State||vcSafe(()=>renderCalibrationV2()),gov=vcSafe(()=>governedComponents()),emp=vcSafe(()=>empiricalLens()),sq=vcSafe(()=>setupQualityCurrent()),heat=vcSafe(()=>observedLiquidationHeatmap(),{rows:[]}),structure=window.__structureV38||{},flow=decisionStateMatches(trueFlowState,{source:false,maxAge:10*60*1000})?trueFlowState:null,micro=decisionStateMatches(window.__microState,{source:false,maxAge:5*60*1000})?window.__microState:null,ext=externalIntelState||{},econ=ext.calendar?.summary,onchain=decisionStateMatches(ext.onchain,{source:false,maxAge:15*60*1000})?ext.onchain:null,predObj=decisionStateMatches(ext.predLiq,{source:false,maxAge:15*60*1000})?ext.predLiq:null,pred=predObj?.summary,opt=decisionStateMatches(ext.options,{source:false,maxAge:15*60*1000})?ext.options:null,hcvd=decisionStateMatches(ext.histCvd,{source:false,maxAge:15*60*1000})?ext.histCvd:null,context=decisionStateMatches(window.__intelContext,{source:false,maxAge:10*60*1000})?vcSafe(()=>contextScoreFrom(window.__intelContext.global,window.__intelContext.macro)):NaN,quality=masterDataQuality();

  const baseBias=Number.isFinite(+ss.sm?.long)&&Number.isFinite(+ss.sm?.short)?clamp((+ss.sm.long- +ss.sm.short)/100,-1,1):dir;
  add(vcItem("Base signal engine","Technical",baseBias,`${ss.tm?.direction||"WAIT"} · L ${(+ss.sm?.long||0).toFixed(0)} / S ${(+ss.sm?.short||0).toFixed(0)}`,"Primary directional engine",{weight:.12}));
  add(vcItem("Trend composite","Technical",vcScoreBias(q.trendScore),Number.isFinite(+q.trendScore)?(+q.trendScore).toFixed(0)+"/100":"—","EMA20/50/200 + Supertrend + DMI composite",{weight:.055}));
  add(vcItem("Momentum composite","Technical",vcScoreBias(q.momScore),Number.isFinite(+q.momScore)?(+q.momScore).toFixed(0)+"/100":"—","RSI + MACD + ROC + Stoch RSI composite",{weight:.045}));
  add(vcItem("Volume / VWAP composite","Technical",(q.volScore==null?NaN:vcScoreBias(q.volScore)),q.volScore!=null&&Number.isFinite(+q.volScore)?(+q.volScore).toFixed(0)+"/100":"—","Relative volume plus VWAP position",{weight:.03}));
  add(vcItem("Structure composite","Technical",vcScoreBias(q.structureScore),Number.isFinite(+q.structureScore)?(+q.structureScore).toFixed(0)+"/100":"—","SMC/structure score and breakout adjustment",{weight:.045}));
  add(vcItem("Multi-timeframe composite","Technical",vcScoreBias(ss.mc?.avg),Number.isFinite(+ss.mc?.avg)?`${(+ss.mc.avg).toFixed(0)}/100 · ${ss.mc.comp||""}`:"—","Weighted 15m/1h/4h/1d context",{weight:.06}));
  add(vcItem("RSI","Technical",Number.isFinite(+q.rsi)?clamp((+q.rsi-50)/25,-1,1):NaN,Number.isFinite(+q.rsi)?(+q.rsi).toFixed(1):"—","Directional around 50; overbought/oversold is not treated as a hard reversal",{weight:.018}));
  add(vcItem("MACD histogram","Technical",vcBoolBias(q.macd),q.macd===true?"POSITIVE":q.macd===false?"NEGATIVE":"—","Sign of MACD histogram",{weight:.02}));
  add(vcItem("Supertrend","Technical",vcTextBias(q.supertrend,["BULL"],["BEAR"]),q.supertrend||"—","Current Supertrend state",{weight:.025}));
  add(vcItem("Ichimoku","Technical",vcTextBias(q.ichimoku,["BULL"],["BEAR"]),q.ichimoku||"—","Current cloud state",{weight:.018}));
  add(vcItem("VWAP position","Technical",Number.isFinite(+q.price)&&typeof q.vwapAbove==="boolean"?(q.vwapAbove?.45:-.45):NaN,q.vwapAbove===true?"ABOVE":q.vwapAbove===false?"BELOW":"—","Price versus rolling VWAP",{weight:.015}));
  add(vcItem("Breakout","Technical",vcTextBias(q.breakout,["UP"],["DOWN"]),q.breakout||"NONE","Breakout relative to recent range",{weight:.022}));
  add(vcItem("CMF","Technical",q.cmf!=null&&Number.isFinite(+q.cmf)?clamp(+q.cmf/.25,-1,1):NaN,q.cmf!=null&&Number.isFinite(+q.cmf)?(+q.cmf).toFixed(3):"—","Chaikin Money Flow",{weight:.018}));
  add(vcItem("MFI","Technical",q.mfi!=null&&Number.isFinite(+q.mfi)?clamp((+q.mfi-50)/25,-1,1):NaN,q.mfi!=null&&Number.isFinite(+q.mfi)?(+q.mfi).toFixed(1):"—","Money Flow Index around 50",{weight:.015}));
  add(vcItem("RSI divergence","Technical",vcTextBias(q.divergence,["BULL"],["BEAR"]),q.divergence||"NONE","Detected RSI divergence",{weight:.018}));

  const vp=vcSafe(()=>volumeProfile(st.j),null);
  let vpBias=NaN,vpVal="—";
  if(vp&&Number.isFinite(+q.price)){vpBias=q.price>vp.vah?.55:q.price<vp.val?-.55:0;vpVal=`P ${num(q.price)} · VA ${num(vp.val)}–${num(vp.vah)} · POC ${num(vp.poc)}`}
  add(vcItem("Volume profile location","Technical",vpBias,vpVal,"Price versus reconstructed value area",{weight:.02,available:!!vp}));
  add(vcStatusItem("ADX trend strength","Technical",Number.isFinite(+q.adx)?(+q.adx).toFixed(1):"—","Direction-neutral trend-strength diagnostic",{available:Number.isFinite(+q.adx)}));
  add(vcStatusItem("Volatility regime","Technical",Number.isFinite(+q.atrPct)?`${(+q.atrPct).toFixed(2)}% ATR · RVp ${Number.isFinite(+q.rvPercentile)?(+q.rvPercentile).toFixed(0):"—"}`:"—","Direction-neutral volatility context",{available:Number.isFinite(+q.atrPct)}));
  const v53=window.__volatilityIntel||volatilityIntelligenceState;
  add(vcStatusItem("Volatility Intelligence Pro","Risk / execution",v53?`${v53.regime} · RV20 ${Number.isFinite(+v53.rv20)?(+v53.rv20).toFixed(1)+"%":"—"} · p${Number.isFinite(+v53.rvPct)?(+v53.rvPct).toFixed(0):"—"}`:"—",v53?`Expansion ${v53.expansion.toFixed(0)} · compression ${v53.compression.toFixed(0)} · Paper multiplier ${v53.riskMultiplier.toFixed(2)}×`:"Dedicated volatility state unavailable",{severity:v53&&(v53.regime==="EXTREME"||v53.regime==="BREAKOUT TRANSITION")?"WARN":null,available:!!v53}));
  add(vcStatusItem("IV / RV volatility premium","Context",v53?.implied?.available?`${v53.implied.premium} · ${Number.isFinite(+v53.implied.ratio)?(+v53.implied.ratio).toFixed(2)+"×":"—"}`:"N/A","Direction-neutral options volatility premium; not a LONG/SHORT vote",{severity:v53?.implied?.available&&Number.isFinite(+v53.implied.ratio)&&+v53.implied.ratio>=1.75?"WARN":null,available:!!v53?.implied?.available}));

  const regBias=reg?.probs?clamp((+reg.probs.TREND_UP||0)-(+reg.probs.TREND_DOWN||0),-1,1):NaN;
  add(vcItem("Regime Engine v2","Models",regBias,reg?`${reg.state} · ${(reg.confidence*100).toFixed(0)}%`:"—","Probabilistic market-state engine",{weight:.055,available:!!reg}));
  const calBias=Number.isFinite(+cal?.p)&&dir?dir*((+cal.p-.5)*2):NaN;
  add(vcItem("Calibration v2","Models",calBias,Number.isFinite(+cal?.p)?`${(+cal.p*100).toFixed(1)}% · ${cal.state||""}`:"—","Calibrated probability of current base direction",{weight:.05,available:Number.isFinite(+cal?.p)}));
  const metaUsable=String(meta?.state||"").startsWith("USABLE"),metaBias=Number.isFinite(+meta?.p)&&dir?dir*((+meta.p-.5)*2):NaN;
  add(vcItem("Meta-label TRADE/SKIP","Models",metaBias,Number.isFinite(+meta?.p)?`${meta.action} · ${(+meta.p*100).toFixed(1)}%`:(meta?.action||"—"),`State ${meta?.state||"N/A"}`,{weight:.055,available:Number.isFinite(+meta?.p)}));
  const mv2=metaEnsembleV2?.models?vcSafe(()=>ensembleCurrentPrediction()):null,mv2Bias=Number.isFinite(+mv2?.p)&&dir?dir*((+mv2.p-.5)*2):NaN;
  add(vcItem("ML Ensemble v2","Models",mv2Bias,mv2?`${mv2.action} · ${(+mv2.p*100).toFixed(1)}% · ${Number.isFinite(+mv2.disagreement)?(+mv2.disagreement*100).toFixed(1)+"pp":"—"}`:"—",mv2?.state||"No trained ensemble",{weight:.06,available:Number.isFinite(+mv2?.p)}));
  const govBias=Number.isFinite(+gov?.ensemble)&&dir?dir*((+gov.ensemble-.5)*2):NaN;
  add(vcItem("Governed ML ensemble","Models",govBias,Number.isFinite(+gov?.ensemble)?`${(+gov.ensemble*100).toFixed(1)}%`:"—","Frozen/governed research ensemble",{weight:.045,available:Number.isFinite(+gov?.ensemble)}));
  const empBias=Number.isFinite(+emp?.cal)&&dir?dir*((+emp.cal-.5)*2):NaN;
  add(vcItem("Empirical similar outcomes","Models",empBias,Number.isFinite(+emp?.cal)?`${(+emp.cal*100).toFixed(1)}% · N${emp.n}`:"—","Shrunk hit rate for comparable confidence history",{weight:.035,available:Number.isFinite(+emp?.cal)&&(+emp.n||0)>=10}));
  const seg=vcSafe(()=>segmentReliability(st.symbol,st.tf,st.mode,q.regime),null),segBias=Number.isFinite(+seg?.shrunkHit)&&dir?dir*((+seg.shrunkHit-.5)*2):NaN;
  add(vcItem("Segment reliability","Models",segBias,Number.isFinite(+seg?.shrunkHit)?`${(+seg.shrunkHit*100).toFixed(1)}% · N${seg.n}`:"—","Hierarchical reliability for symbol/TF/mode/regime",{weight:.028,available:Number.isFinite(+seg?.shrunkHit)}));
  const drift=driftSnapshot?.state||"NO TEST";
  add(vcStatusItem("Model/data drift","Models",drift,drift==="DRIFT"?"Detected distribution/performance drift":"Current drift monitor state",{severity:drift==="DRIFT"?"WARN":null,available:drift!=="NO TEST"}));

  add(vcItem("True recent trade-flow CVD","Flow",flow&&!flow.error&&Number.isFinite(+flow.delta)?clamp(+flow.delta/35,-1,1):NaN,flow&&!flow.error?`${flow.state} · ${flow.delta>=0?"+":""}${(+flow.delta).toFixed(1)}%`:"—","Binance aggregate-trade taker flow",{weight:.055,available:!!flow&&!flow.error&&Number.isFinite(+flow.delta)}));
  add(vcItem("Historical CVD","Flow",hcvd?.available&&Number.isFinite(+hcvd.summary?.deltaPct)?clamp(+hcvd.summary.deltaPct/15,-1,1):NaN,hcvd?.available?`${hcvd.summary?.state||"—"} · ${Number.isFinite(+hcvd.coverage)?(+hcvd.coverage*100).toFixed(0)+"% coverage":"—"}`:"—","Provider historical taker buy/sell window",{weight:.06,available:!!hcvd?.available&&Number.isFinite(+hcvd.summary?.deltaPct)}));
  add(vcItem("Pionex microstructure","Flow",crypto&&Number.isFinite(+micro?.composite?.score)?clamp(+micro.composite.score/60,-1,1):NaN,crypto&&micro?.composite?`${micro.composite.bias} · ${(+micro.composite.score).toFixed(1)}`:"—","Recent trade/depth microstructure composite",{weight:.032,available:crypto&&Number.isFinite(+micro?.composite?.score)}));
  const liqBias=heat?.rows?.length&&(+heat.short+ +heat.long)>0?clamp((+heat.short- +heat.long)/(+heat.short+ +heat.long),-1,1):NaN;
  add(vcItem("Observed liquidation tape","Flow",liqBias,heat?.rows?.length?`Long ${compact(heat.long)} · Short ${compact(heat.short)}`:"—","Observed Binance liquidation events; short liquidations map positive",{weight:.022,available:!!heat?.rows?.length}));
  add(vcItem("Predictive liquidation map","Flow",pred?.available&&Number.isFinite(+pred.imbalance)?clamp(+pred.imbalance,-1,1):NaN,pred?.available?`${pred.state} · peak ${pred.peak?num(pred.peak.price):"—"}`:"—","Provider-model liquidity-density imbalance",{weight:.025,available:!!pred?.available&&Number.isFinite(+pred.imbalance)}));

  add(vcItem("Cross-market context","Context",Number.isFinite(+context)?vcScoreBias(context):NaN,Number.isFinite(+context)?(+context).toFixed(0)+"/100":"—","Existing QQQ/SPY/IWM/TLT/GLD / global context score",{weight:.027,available:Number.isFinite(+context)}));
  const breadth64=window.__marketBreadthV64,breadth64Ok=!!breadth64&&Date.now()-(+breadth64.ts||0)<20*60*1000&&Number.isFinite(+breadth64.score);add(vcItem("Market Breadth Pro","Context",breadth64Ok?vcScoreBias(+breadth64.score):NaN,breadth64Ok?`${breadth64.state} · ${(+breadth64.score).toFixed(0)}/100 · ${breadth64.n}/${breadth64.total}`:"—",breadth64Ok?`${breadth64.universe} · ${breadth64.divergence||"NONE"}`:"Breadth snapshot unavailable",{weight:.045,available:breadth64Ok}));
  const d65=vcSafe(()=>v65DecisionSuite(false),null);if(d65){
    add(vcItem("Regime Intelligence v65","Models",d65.regime.bias,`${d65.regime.state} · ${d65.regime.score.toFixed(0)}/100`,d65.regime.detail,{weight:.018,available:true}));
    add(vcItem("Liquidity / Structure v65","Technical",d65.structure.bias,`${d65.structure.state} · ${d65.structure.score.toFixed(0)}/100`,d65.structure.detail,{weight:.018,available:true}));
    add(vcItem("Cross-Asset Confirmation v65","Context",d65.crossAsset.bias,`${d65.crossAsset.state} · ${d65.crossAsset.score.toFixed(0)}/100`,d65.crossAsset.detail,{weight:.015,available:true}));
    add(vcStatusItem("Conflict Resolver v65","Risk / execution",`${d65.conflict.state} · ${d65.conflict.score.toFixed(0)}/100`,d65.conflict.detail,{severity:d65.conflict.severity==="BLOCK"?"BLOCK":d65.conflict.severity==="WARN"?"WARN":null,available:true}));
    add(vcStatusItem("Adaptive Entry v65","Risk / execution",d65.entry.state,d65.entry.action,{severity:d65.entry.severity==="BLOCK"?"BLOCK":null,available:true}));
    add(vcStatusItem("Dynamic Exit v65","Risk / execution",d65.exit.state,d65.exit.action,{available:true}));
    add(vcStatusItem("Portfolio Allocator v65","Risk / execution",d65.allocator.state,d65.allocator.detail,{severity:d65.allocator.severity==="BLOCK"?"BLOCK":null,available:true}));
    add(vcStatusItem("Failure Pattern Memory v65","Models",d65.failure.state,d65.failure.detail,{severity:d65.failure.severity==="WARN"?"WARN":null,available:true}));
    add(vcStatusItem("Event Risk Engine v65","Context",d65.eventRisk.state,d65.eventRisk.detail,{severity:d65.eventRisk.severity==="BLOCK"?"BLOCK":d65.eventRisk.severity==="WARN"?"WARN":null,available:true}));
    add(vcStatusItem("Decision Replay v65","Models",d65.replay.state,d65.replay.detail,{available:true}));
    add(vcStatusItem("Performance Control Room v65","Risk / execution",d65.control.state,d65.control.detail,{severity:d65.control.severity==="WARN"?"WARN":null,available:true}));
    add(vcStatusItem("Kill Switch v65","Risk / execution",d65.killSwitch.state,d65.killSwitch.detail,{severity:d65.killSwitch.state==="NO NEW TRADES"?"BLOCK":d65.killSwitch.state==="CAUTION"?"WARN":null,available:true}));
    const e66=vcSafe(()=>v66EdgeValidationSuite(false),null);if(e66){add(vcStatusItem("Edge Validation v66","Models",`${e66.state} · ${e66.quality.score}/100`,e66.quality.detail,{severity:e66.hardBlock?"BLOCK":e66.quality.score<55?"WARN":null,available:true}));add(vcStatusItem("Setup DNA v66","Models",`${e66.dna.state} · N${e66.dna.current?.n||0}`,e66.dna.detail,{severity:e66.dna.state==="BLACKLIST"?"WARN":null,available:true}));add(vcStatusItem("Edge Decay v66","Models",e66.decay.state,e66.decay.detail,{severity:e66.decay.state==="SEVERE"?"BLOCK":e66.decay.state==="DRIFT"?"WARN":null,available:true}));add(vcStatusItem("Data Sufficiency v66","Risk / execution",`${e66.sufficiency.state} · ${e66.sufficiency.score}/100`,e66.sufficiency.detail,{severity:e66.sufficiency.state==="LOW"?"WARN":null,available:true}));}
  }
  add(vcItem("On-chain context","Context",crypto&&Number.isFinite(+onchain?.contextScore)?vcScoreBias(onchain.contextScore):NaN,crypto&&Number.isFinite(+onchain?.contextScore)?`${(+onchain.contextScore).toFixed(0)}/100 · ${onchain.whales?.available?"network + flows":"network"}`:"—","Coin Metrics network plus optional attributed exchange flows",{weight:.032,available:crypto&&Number.isFinite(+onchain?.contextScore)}));
  add(vcItem("Options context","Context",crypto&&opt?.available&&Number.isFinite(+opt.context?.score)?vcScoreBias(opt.context.score):NaN,crypto&&opt?.available?`${opt.context?.state||"BALANCED"} · PCR ${Number.isFinite(+opt.putCallOiRatio)?(+opt.putCallOiRatio).toFixed(2):"—"}`:"—","Deribit OI/IV/skew proxy context",{weight:.02,available:crypto&&!!opt?.available&&Number.isFinite(+opt.context?.score)}));
  const deriv=window.__derivativesState?.context||"N/A",derivBias=vcTextBias(deriv,["CONTRARIAN +","BULL"],["CROWDED","BEAR"]);
  add(vcItem("Futures positioning","Context",crypto&&deriv!=="N/A"?derivBias:NaN,crypto?deriv:"N/A","Funding/OI derivatives context",{weight:.018,available:crypto&&deriv!=="N/A"}));
  const fgText=$("fearGreed")?.textContent||"",fgNum=parseFloat(fgText);
  add(vcItem("Fear & Greed","Context",crypto&&Number.isFinite(fgNum)?clamp((fgNum-50)/50,-1,1):NaN,crypto&&fgText?fgText:"—","External sentiment indicator; low weight",{weight:.012,available:crypto&&Number.isFinite(fgNum)}));
  const news=window.__intelNews,newsSev=+news?.high>0?"WARN":null;
  add(vcStatusItem("News / event radar","Context",news?`${news.risk||"N/A"} · high ${+news.high||0}`:"N/A",newsSev?"High-risk news events detected":"No high-risk news blocker",{severity:newsSev,available:!!news}));
  const econSev=econ?.risk==="BLACKOUT"?"BLOCK":econ?.risk==="HIGH"||econ?.risk==="ELEVATED"?"WARN":null;
  add(vcStatusItem("Economic calendar","Context",econ?.available?`${econ.risk}${Number.isFinite(+econ.mins)?" · "+extMinsText(econ.mins):""}`:(ext.calendar?.configured===false?"CONFIGURE":"N/A"),econ?.next?.event||"Macro event-risk window",{severity:econSev,available:!!econ?.available}));

  const sweep=structure?.sweep,swBias=sweep&&Number.isFinite(+sweep.score)?(String(sweep.type||"").startsWith("SELL-SIDE")?+1:String(sweep.type||"").startsWith("BUY-SIDE")?-1:0)*(+sweep.score/100):NaN;
  add(vcItem("Liquidity sweep confirmation","Technical",swBias,sweep?`${sweep.type} · ${(+sweep.score||0).toFixed(0)}`:"—","Sell-side sweep/reclaim maps bullish; buy-side maps bearish",{weight:.035,available:!!sweep&&Number.isFinite(+sweep.score)}));
  add(vcStatusItem("Premium / Discount","Technical",structure?.premiumDiscount?.zone||q.liquidity?.premium||"—","Structure location context; displayed without assuming automatic mean reversion",{available:!!(structure?.premiumDiscount?.zone||q.liquidity?.premium)}));
  add(vcStatusItem("Nearest FVG","Technical",structure?.nearestFvg?`${structure.nearestFvg.type||""} · ${structure.nearestFvg.status||""}`:"—","Fair-value-gap lifecycle context",{available:!!structure?.nearestFvg}));

  const rr=ss.tm?.direction!=="WAIT"&&Number.isFinite(+ss.tm?.entryLow)&&Number.isFinite(+ss.tm?.entryHigh)&&Number.isFinite(+ss.tm?.stop)&&Number.isFinite(+ss.tm?.tp2)?Math.abs(ss.tm.tp2-(ss.tm.entryLow+ss.tm.entryHigh)/2)/Math.max(1e-12,Math.abs((ss.tm.entryLow+ss.tm.entryHigh)/2-ss.tm.stop)):NaN;
  add(vcStatusItem("Setup quality","Risk / execution",sq?`${sq.grade} · ${(+sq.overall).toFixed(0)}/100`:"—",sq?.blocker&&sq.blocker!=="None"?sq.blocker:"Current setup-quality gate",{severity:sq?.blocker&&sq.blocker!=="None"?"WARN":null,available:!!sq}));
  add(vcStatusItem("Risk / reward","Risk / execution",Number.isFinite(rr)?`TP2 ${rr.toFixed(2)}R`:"—","Current trade-map reward/risk",{severity:Number.isFinite(rr)&&rr<1.2?"WARN":null,available:Number.isFinite(rr)}));
  const guard=vcSafe(()=>riskGuard(),null);
  add(vcStatusItem("Risk Guard","Risk / execution",guard?`${guard.state||""} · ${Number.isFinite(+guard.mult)?(+guard.mult).toFixed(2)+"×":""}`:"—",guard?.reason||"Risk guard state",{severity:guard&&(guard.state==="BLOCK"||+guard.mult===0)?"BLOCK":null,available:!!guard}));
  const budget=window.__portfolioRisk?.preTrade?.gate?.state||vcSafe(()=>portfolioBudgetSummary(window.__portfolioRisk?.clusters||[]).state,"PASS");
  add(vcStatusItem("Portfolio budget gate","Risk / execution",budget,"Pre-trade portfolio risk budget",{severity:budget==="BLOCK"||budget==="PAUSE"?"BLOCK":budget==="WATCH"?"WARN":null,available:true}));
  const pv3=window.__portfolioV3;
  add(vcStatusItem("Portfolio Risk v3","Risk / execution",pv3?.state||"N/A",pv3?`ES97.5 ${money(pv3.es975)} · dynamic corr ${Number.isFinite(+pv3.short?.avgCorr)?(+pv3.short.avgCorr).toFixed(2):"—"}`:"No open Paper portfolio",{severity:pv3?.state==="HIGH"?"WARN":pv3?.state==="WATCH"?"WARN":null,available:!!pv3}));
  const stress=window.__portfolioStress;
  add(vcStatusItem("Advanced stress suite","Risk / execution",stress?.state||"N/A",stress?.worst?`${stress.worst.name} · ${money(stress.worst.pnl)}`:"No open Paper portfolio",{severity:stress?.state==="SEVERE"?"BLOCK":stress?.state==="HIGH"||stress?.state==="WATCH"?"WARN":null,available:!!stress}));
  const life=vcSafe(()=>strategyLifecycle(),null);
  add(vcStatusItem("Strategy lifecycle","Risk / execution",life?.state||"N/A","Current research strategy lifecycle",{severity:life?.state==="RETIRED"?"BLOCK":life?.state==="WATCH"?"WARN":null,available:!!life}));
  const cb=vcSafe(()=>paperCircuitBreaker(),null);
  add(vcStatusItem("Paper circuit breaker","Risk / execution",cb?`${cb.state} · ${Number.isFinite(+cb.mult)?(+cb.mult).toFixed(2)+"×":""}`:"N/A",cb?.reason||"Paper-only circuit breaker",{severity:cb?.state==="PAUSE"?"BLOCK":null,available:!!cb}));
  add(vcStatusItem("Data quality","Risk / execution",`${quality.toFixed(0)}/100`,quality<55?"Below Master Verdict gate":"Freshness/source consistency score",{severity:quality<55?"BLOCK":quality<75?"WARN":null,available:true}));
  const friction=structure?.friction;
  add(vcStatusItem("Execution friction","Risk / execution",friction?`${(+friction.roundTripBps||0).toFixed(1)} bps · ${Number.isFinite(+friction.costR)?(+friction.costR).toFixed(2)+"R":""}`:"N/A","Estimated fee/slippage friction",{severity:friction&&Number.isFinite(+friction.costR)&&+friction.costR>.25?"WARN":null,available:!!friction}));
  const live63=vcSafe(()=>v63LiveReadiness(false),null);
  add(vcStatusItem("Live Readiness v63","Risk / execution",live63?`${live63.state} · ${live63.score}/100`:"N/A",live63?.reasons?.length?`Incomplete: ${live63.reasons.join(", ")}`:"Strict evidence/execution/data eligibility gate",{severity:live63?.state==="NOT ELIGIBLE"?"WARN":null,available:!!live63}));

  const directional=mods.filter(x=>x.directional&&x.available&&!x.severity&&Math.abs(x.bias)>=.15),bull=mods.filter(x=>x.category==="BULLISH"),bear=mods.filter(x=>x.category==="BEARISH"),neutral=mods.filter(x=>x.category==="NEUTRAL"),blocks=mods.filter(x=>x.category==="BLOCKER"),support=dir?directional.filter(x=>x.bias*dir>0).length:0,oppose=dir?directional.filter(x=>x.bias*dir<0).length:0,agreement=dir&&support+oppose?support/(support+oppose)*100:NaN,available=mods.filter(x=>x.available).length,coverage=mods.length?available/mods.length*100:0,wRows=mods.filter(x=>x.directional&&x.available&&!x.severity&&x.weight>0),wSum=wRows.reduce((a,x)=>a+x.weight,0)||1,wBias=wRows.reduce((a,x)=>a+x.bias*x.weight,0)/wSum,conviction=Math.abs(wBias)*100,consensus=wBias>=.12?"BULLISH":wBias<=-.12?"BEARISH":"MIXED / NEUTRAL",families={};
  for(const family of ["Technical","Models","Flow","Context","Risk / execution"]){const a=mods.filter(x=>x.family===family),d=a.filter(x=>x.directional&&x.available&&!x.severity&&x.weight>0),ws=d.reduce((z,x)=>z+x.weight,0)||1,b=d.length?d.reduce((z,x)=>z+x.bias*x.weight,0)/ws:NaN;families[family]={bull:a.filter(x=>x.category==="BULLISH").length,bear:a.filter(x=>x.category==="BEARISH").length,neutral:a.filter(x=>x.category==="NEUTRAL").length,block:a.filter(x=>x.category==="BLOCKER").length,bias:b,state:Number.isFinite(b)?(b>=.12?"BULLISH":b<=-.12?"BEARISH":"MIXED"):(a.some(x=>x.category==="BLOCKER")?"RISK":"NEUTRAL")}}
  return {modules:mods,dir,agreement,coverage,weightedBias:wBias,conviction,consensus,counts:{bullish:bull.length,bearish:bear.length,neutral:neutral.length,blocker:blocks.length,hard:blocks.filter(x=>x.severity==="BLOCK").length,warn:blocks.filter(x=>x.severity==="WARN").length},families,ts:Date.now()}
}
function vcFamilyText(x){
  if(!x)return "—";const prefix=x.state||"—",bias=Number.isFinite(+x.bias)?` · ${x.bias>=0?"+":""}${(+x.bias*100).toFixed(0)}`:"";return `${prefix}${bias} · B${x.bull}/S${x.bear}/N${x.neutral}${x.block?"/X"+x.block:""}`
}
function vcChipList(rows,empty){
  return rows.length?rows.map(x=>`<span class="vcChip" title="${escapeHtml(x.value+" · "+x.note)}">${escapeHtml(x.name)}${x.directional&&Number.isFinite(x.strength)?" "+x.strength.toFixed(0):""}</span>`).join(""):`<span class="small">${empty}</span>`
}
function renderVerdictCenter(snapshot=null){
  const x=snapshot?.modules?snapshot:buildVerdictCenterSnapshot();window.__verdictCenter=x;
  if(!$("vcAgreement"))return x;
  const ag=Number.isFinite(x.agreement)?x.agreement:null;$("vcAgreement").textContent=ag==null?"N/A":ag.toFixed(0)+"%";$("vcAgreementBar").style.width=(ag==null?0:clamp(ag,0,100))+"%";$("vcConsensus").textContent=`${x.consensus} · ${x.weightedBias>=0?"+":""}${(x.weightedBias*100).toFixed(0)}`;$("vcConsensus").className=x.consensus==="BULLISH"?"vcBiasBull":x.consensus==="BEARISH"?"vcBiasBear":"vcBiasNeutral";$("vcBullishCount").textContent=x.counts.bullish;$("vcBearishCount").textContent=x.counts.bearish;$("vcNeutralCount").textContent=x.counts.neutral;$("vcBlockerCount").textContent=`${x.counts.hard} hard / ${x.counts.warn} warn`;$("vcCoverage").textContent=`${x.coverage.toFixed(0)}% · ${x.modules.filter(m=>m.available).length}/${x.modules.length}`;$("vcConviction").textContent=x.conviction.toFixed(0)+"/100";
  $("vcFamilyTechnical").textContent=vcFamilyText(x.families["Technical"]);$("vcFamilyModels").textContent=vcFamilyText(x.families["Models"]);$("vcFamilyFlow").textContent=vcFamilyText(x.families["Flow"]);$("vcFamilyContext").textContent=vcFamilyText(x.families["Context"]);$("vcFamilyRisk").textContent=vcFamilyText(x.families["Risk / execution"]);
  $("vcBullishModules").innerHTML=vcChipList(x.modules.filter(m=>m.category==="BULLISH"),"No bullish module above threshold.");$("vcBearishModules").innerHTML=vcChipList(x.modules.filter(m=>m.category==="BEARISH"),"No bearish module above threshold.");$("vcNeutralModules").innerHTML=vcChipList(x.modules.filter(m=>m.category==="NEUTRAL"),"No neutral/unavailable modules.");$("vcBlockerModules").innerHTML=vcChipList(x.modules.filter(m=>m.category==="BLOCKER"),"No blocker or warning.");
  const cls=c=>c==="BULLISH"?"vcBiasBull":c==="BEARISH"?"vcBiasBear":c==="BLOCKER"?"vcBiasBlock":"vcBiasNeutral";
  $("vcModuleTable").innerHTML=`<div class="vcRow"><div class="vcCell">Module</div><div class="vcCell">Family</div><div class="vcCell">Category</div><div class="vcCell">Strength</div><div class="vcCell">Weight</div><div class="vcCell">Current value</div><div class="vcCell note">Interpretation</div></div>`+x.modules.map(m=>`<div class="vcRow"><div class="vcCell">${escapeHtml(m.name)}</div><div class="vcCell">${escapeHtml(m.family)}</div><div class="vcCell ${cls(m.category)}">${m.category}${m.severity?" · "+m.severity:""}</div><div class="vcCell">${m.directional&&Number.isFinite(m.strength)?m.strength.toFixed(0)+"/100":"—"}</div><div class="vcCell">${m.weight?m.weight.toFixed(3):"—"}</div><div class="vcCell">${escapeHtml(m.value)}</div><div class="vcCell note">${escapeHtml(m.note)}</div></div>`).join("");
  const baseDir=x.dir>0?"LONG":x.dir<0?"SHORT":"WAIT",agreementText=Number.isFinite(x.agreement)?`${x.agreement.toFixed(0)}% of non-neutral directional modules agree with base ${baseDir}.`:`Base direction is ${baseDir}; directional agreement is not defined.`,riskText=x.counts.hard?`${x.counts.hard} hard blocker${x.counts.hard===1?"":"s"} active.`:x.counts.warn?`${x.counts.warn} warning${x.counts.warn===1?"":"s"} active; no hard blocker.`:"No explicit risk blocker is active.";
  $("vcNarrative").textContent=`${agreementText} Weighted module consensus: ${x.consensus} (${x.conviction.toFixed(0)}/100 conviction). Coverage ${x.coverage.toFixed(0)}%. ${riskText} Module counts are descriptive; many modules share the same underlying price/volume history and are not independent probabilities.`;
  return x
}

function veSetList(id,rows,type="neutral",fallback="—"){
  const el=$(id);if(!el)return;el.replaceChildren();
  const items=(rows||[]).filter(Boolean);
  if(!items.length){const span=document.createElement("span");span.className="small";span.textContent=fallback;el.appendChild(span);return}
  for(const text of items.slice(0,5)){const row=document.createElement("div"),ico=document.createElement("i"),txt=document.createElement("span");row.className=`decisionListItem ${type}`;ico.textContent=type==="support"?"+":type==="oppose"?"−":type==="unlock"?"→":"•";txt.textContent=String(text);row.append(ico,txt);el.appendChild(row)}
}
function veModuleScore(m){return Math.abs(+m?.bias||0)*Math.max(.015,+m?.weight||.015)}
function veModuleText(m){return `${m.name} · ${m.value}`}
function renderVerdictExplainer(ctx={}){
  const st=window.__radarState,ss=window.__signalState,vc=ctx.vc||window.__verdictCenter||buildVerdictCenterSnapshot(),verdict=ctx.verdict||"WAIT",dir=Number.isFinite(ctx.dir)?ctx.dir:(ss?.tm?.direction==="LONG"?1:ss?.tm?.direction==="SHORT"?-1:0),base=dir>0?"LONG":dir<0?"SHORT":"WAIT",gates=Array.isArray(ctx.gates)?ctx.gates:[],quality=Number.isFinite(+ctx.quality)?+ctx.quality:masterDataQuality(),cal=ctx.cal||calibrationV2State||null;
  const directional=(vc.modules||[]).filter(m=>m.available&&m.directional&&!m.severity&&Number.isFinite(+m.bias)&&Math.abs(+m.bias)>=.15),targetDir=dir||(vc.weightedBias>=.12?1:vc.weightedBias<=-.12?-1:0),support=targetDir?directional.filter(m=>m.bias*targetDir>0).sort((a,b)=>veModuleScore(b)-veModuleScore(a)):[],oppose=targetDir?directional.filter(m=>m.bias*targetDir<0).sort((a,b)=>veModuleScore(b)-veModuleScore(a)):[],warnings=(vc.modules||[]).filter(m=>m.severity==="WARN"),hardModules=(vc.modules||[]).filter(m=>m.severity==="BLOCK"),hardCount=Math.max(gates.length,hardModules.length),warnCount=warnings.length;
  const ag=Number.isFinite(+vc.agreement)?+vc.agreement:NaN,cov=Number.isFinite(+vc.coverage)?+vc.coverage:0,conv=Number.isFinite(+vc.conviction)?+vc.conviction:0;
  if($("decisionCall")){$("decisionCall").textContent=verdict;$("decisionCall").className="decisionCall "+(verdict==="LONG"?"good":verdict==="SHORT"?"bad":"neutral")}
  let riskText="FĂRĂ BLOCKER HARD",riskClass="good";if(hardCount){riskText=`BLOCAT · ${hardCount}`;riskClass="bad"}else if(warnCount){riskText=`ATENȚIE · ${warnCount}`;riskClass="warn"}if($("decisionRiskState")){$("decisionRiskState").textContent=riskText;$("decisionRiskState").className=`decisionRisk ${riskClass}`}
  let headline,action;
  if(!st||!ss){headline="Nu există încă o analiză completă pentru simbolul curent.";action="Rulează analiza; verdictul va explica direcția, blocker-ele și condițiile de deblocare."}
  else if(verdict==="WAIT"){
    if(base==="WAIT")headline=`WAIT: motorul de bază nu confirmă încă LONG sau SHORT. Consensul ponderat este ${vc.consensus||"N/A"}.`;
    else if(hardCount)headline=`Bias de bază ${base}, dar setup-ul NU este executabil: ${hardCount} condiție${hardCount===1?"":"i"} hard îl blochează.`;
    else headline=`Bias de bază ${base}, dar consensul este prea slab sau conflictual pentru a activa setup-ul.`;
    action=`ACȚIUNE: STAI PE MARGINE. Nu activa ${base==="WAIT"?"o poziție":base} până nu dispar condițiile de blocare și analiza nu revine LONG/SHORT.`
  }else{
    headline=`${verdict} activ în research/paper · ${Number.isFinite(ag)?ag.toFixed(0)+"% acord direcțional":"acord N/A"} · consens ${vc.consensus||"N/A"} · ${conv.toFixed(0)}/100 convicție.`;
    action=`ACȚIUNE RESEARCH/PAPER: setup ${verdict} validat de gate-urile curente. Folosește numai zona de entry/stop afișată și reanalizează dacă verdictul revine WAIT.`
  }
  if($("decisionHeadline"))$("decisionHeadline").textContent=headline;if($("decisionActionLine"))$("decisionActionLine").textContent=action;
  if($("decisionBaseBias"))$("decisionBaseBias").textContent=base;if($("decisionAgreement"))$("decisionAgreement").textContent=Number.isFinite(ag)?ag.toFixed(0)+"%":"N/A";
  if($("decisionCalibrated"))$("decisionCalibrated").textContent=dir&&Number.isFinite(+cal?.p)?`${base} ${(cal.p*100).toFixed(0)}%`:"N/A";
  if($("decisionConsensus"))$("decisionConsensus").textContent=`${vc.consensus||"N/A"}${Number.isFinite(+vc.weightedBias)?` · ${vc.weightedBias>=0?"+":""}${(vc.weightedBias*100).toFixed(0)}`:""}`;
  if($("decisionCoverage"))$("decisionCoverage").textContent=`${cov.toFixed(0)}% · ${(vc.modules||[]).filter(m=>m.available).length}/${(vc.modules||[]).length}`;if($("decisionQuality"))$("decisionQuality").textContent=quality.toFixed(0)+"/100";
  veSetList("decisionWhyList",support.map(veModuleText),"support",targetDir?"Nu există încă dovezi direcționale puternice aliniate.":"Direcția dominantă nu este încă definită.");
  const againstRows=oppose.map(veModuleText);if(!againstRows.length&&warnings.length)againstRows.push(...warnings.slice(0,3).map(m=>`${m.name} · ${m.value}`));veSetList("decisionAgainstList",againstRows,"oppose","Nu există opoziție direcțională puternică.");
  const unlocks=gates.map(g=>g.unlock||g.why||String(g));if(!gates.length){if(Number.isFinite(ag)&&ag<60)unlocks.push(`Acordul direcțional este ${ag.toFixed(0)}%; o confirmare mai largă ar reduce conflictul.`);if(cov<75)unlocks.push(`Coverage este ${cov.toFixed(0)}%; așteaptă mai multe module disponibile.`);if(quality<70)unlocks.push(`Data quality este ${quality.toFixed(0)}/100; ideal este să crească înainte de a forța setup-ul.`)}
  if(warnings.length)unlocks.push(...warnings.slice(0,2).map(m=>`Atenție: ${m.name} · ${m.value}`));veSetList("decisionUnlockList",unlocks,"unlock",verdict==="WAIT"?"Așteaptă o nouă analiză cu direcție și edge suficient.":"Niciun blocker hard; monitorizează dacă apar avertismente noi.");
  const tm=ss?.tm,hasPlan=tm&&Number.isFinite(+tm.entryLow)&&Number.isFinite(+tm.entryHigh)&&Number.isFinite(+tm.stop);let plan="—";
  if(hasPlan){plan=`${base==="WAIT"?"CANDIDAT":base} · Entry ${num(tm.entryLow)}–${num(tm.entryHigh)} · Stop ${num(tm.stop)}${Number.isFinite(+tm.tp1)?` · TP1 ${num(tm.tp1)}`:""}${Number.isFinite(+tm.tp2)?` · TP2 ${num(tm.tp2)}`:""}`;if(verdict==="WAIT")plan+=" · INACTIV"}
  if($("decisionTradePlan"))$("decisionTradePlan").textContent=plan;if($("decisionTradeNote"))$("decisionTradeNote").textContent=verdict==="WAIT"?"Plan candidat numai pentru context; este INACTIV cât timp verdictul final este WAIT.":"Setup research/paper activ; verdictul nu garantează rezultatul și nu execută ordine reale.";
  const out={verdict,base,headline,action,riskState:riskText,agreement:ag,coverage:cov,conviction:conv,quality,gates:gates.map(g=>({code:g.code,why:g.why,unlock:g.unlock})),support:support.slice(0,5).map(m=>m.name),opposition:oppose.slice(0,5).map(m=>m.name),ts:Date.now()};window.__verdictExplanation=out;return out
}

function renderMasterVerdict(){
  const st=window.__radarState,ss=window.__signalState;if(!st||!ss){$("masterVerdict").textContent="WAIT";const vc=renderVerdictCenter();renderVerdictExplainer({verdict:"WAIT",dir:0,quality:masterDataQuality(),gates:[],vc});return}
  const dir=ss.tm.direction==="LONG"?1:ss.tm.direction==="SHORT"?-1:0,conf=Math.max(ss.sm.long,ss.sm.short)/100,reg=regimeV2State||renderRegimeV2(),meta=currentMetaDecision(),cal=calibrationV2State||renderCalibrationV2(),flow=decisionStateMatches(trueFlowState,{source:false,maxAge:10*60*1000})?trueFlowState:null,heat=observedLiquidationHeatmap(),sq=setupQualityCurrent(),budget=window.__portfolioRisk?.preTrade?.gate?.state||portfolioBudgetSummary(window.__portfolioRisk?.clusters||[]).state,quality=masterDataQuality(),gov=governedComponents(),context=decisionStateMatches(window.__intelContext,{source:false,maxAge:10*60*1000})?contextScoreFrom(window.__intelContext.global,window.__intelContext.macro):NaN,structure=window.__structureV38,life=strategyLifecycle(),guard=riskGuard(),ext=externalIntelState||{},econ=ext.calendar?.summary,onchain=decisionStateMatches(ext.onchain,{source:false,maxAge:15*60*1000})?ext.onchain:null,predObj=decisionStateMatches(ext.predLiq,{source:false,maxAge:15*60*1000})?ext.predLiq:null,predLiq=predObj?.summary,opt=decisionStateMatches(ext.options,{source:false,maxAge:15*60*1000})?ext.options:null,histCvd=decisionStateMatches(ext.histCvd,{source:false,maxAge:15*60*1000})?ext.histCvd:null,volIntel=decisionStateMatches(window.__volatilityIntel,{tf:true,maxAge:15*60*1000})?window.__volatilityIntel:null,breadth=window.__marketBreadthV64&&Date.now()-(+window.__marketBreadthV64.ts||0)<20*60*1000?window.__marketBreadthV64:null,parts=[],pos=[],risks=[];
  const decision65=v65DecisionSuite(false),edge66=v66EdgeValidationSuite(false),ops67=typeof v67OperationsSnapshot==="function"?v67OperationsSnapshot(false):null;
  const add=(name,v,w,good,bad)=>{if(Number.isFinite(v)){parts.push({name,v,w});if(Math.abs(v)>=.15)(v*dir>0?pos:risks).push(v*dir>0?good:bad)}};
  add("base",dir*conf,.26,"Base engine aligned","Base engine weak/opposed");
  if(reg)add("regime",(reg.probs.TREND_UP-reg.probs.TREND_DOWN),.14,"Regime supports direction","Regime opposes direction");
  if(cal)add("calibration",dir*(cal.p-.5)*2,.12,"Calibration supports setup","Calibration is weak");
  if(Number.isFinite(meta.p)&&String(meta.state||"").startsWith("USABLE"))add("meta",dir*(meta.p-.5)*2,.14,"Meta-label TRADE evidence","Meta-label SKIP pressure");
  if(flow&&!flow.error)add("flow",clamp(flow.delta/35,-1,1),.12,"True trade-flow aligned","True trade-flow opposed");
  if(heat.rows.length){const lv=heat.short+heat.long?clamp((heat.short-heat.long)/(heat.short+heat.long),-1,1):0;add("liquidations",lv,.06,"Observed liquidations aligned","Observed liquidations opposed")}
  if(sq){const v=dir*((sq.overall-50)/50);add("setup",v,.09,"Setup quality strong","Setup quality weak");if(sq.blocker&&sq.blocker!=="None")risks.push(sq.blocker)}
  if(Number.isFinite(gov?.ensemble))add("governed",dir*(gov.ensemble-.5)*2,.07,"Governed ML supports setup","Governed ML is weak");
  if(Number.isFinite(context))add("context",dir*((context-50)/50),.04,"Cross-market context aligned","Cross-market context opposed");
  if(breadth&&Number.isFinite(+breadth.score))add("breadth",dir*((+breadth.score-50)/50),.06,"Market breadth confirms participation","Market breadth opposes the setup");
  if(assetClass()==="CRYPTO"&&Number.isFinite(onchain?.contextScore))add("onchain",((onchain.contextScore-50)/50),.04,"On-chain activity/flows support upside context","On-chain activity/flows lean defensive");
  if(assetClass()==="CRYPTO"&&histCvd?.available&&Number.isFinite(histCvd?.summary?.deltaPct)&&(+histCvd.coverage||0)>=.75)add("histCvd",clamp(histCvd.summary.deltaPct/15,-1,1),.07,"Historical taker CVD aligned","Historical taker CVD opposed");
  if(assetClass()==="CRYPTO"&&opt?.available&&Number.isFinite(opt?.context?.score))add("options",((opt.context.score-50)/50),.025,"Options context supports upside","Options market shows downside hedge demand");
  if(structure?.sweep&&Number.isFinite(+structure.sweep.score)){const aligned=(dir>0&&String(structure.sweep.type).startsWith("SELL-SIDE"))||(dir<0&&String(structure.sweep.type).startsWith("BUY-SIDE"));add("structure",dir*(aligned?1:-1)*(+structure.sweep.score/100),.06,"Liquidity sweep confirms setup","Liquidity sweep opposes setup")}
  if(life?.state==="RETIRED")risks.push("Strategy lifecycle RETIRED");else if(life?.state==="PROMOTED")pos.push("Strategy lifecycle PROMOTED");
  if(guard?.state==="BLOCK"||guard?.mult===0)risks.push("Risk Guard BLOCK");
  if(driftSnapshot?.state==="DRIFT")risks.push("Model/data drift detected");
  if(window.__intelNews?.high>0)risks.push(`High-risk news events ${window.__intelNews.high}`);
  else if(window.__intelNews?.risk==="LOW")pos.push("News event risk low");
  if(window.__derivativesState?.context==="CROWDED")risks.push("Futures positioning crowded");
  else if(window.__derivativesState?.context==="CONTRARIAN +")pos.push("Contrarian futures context");
  if(metaEnsembleV2?.models){
    const mv2=ensembleCurrentPrediction(),cfg=metaEnsembleV2.config||ensembleV2Config();
    if(mv2.state==="USABLE ENSEMBLE"&&mv2.disagreement<=cfg.maxDisagreement)pos.push("ML Ensemble v2 OOS gate passed");
    if(Number.isFinite(mv2.disagreement)&&mv2.disagreement>cfg.maxDisagreement)risks.push(`ML model disagreement ${(mv2.disagreement*100).toFixed(0)} pp`);
    if(mv2.state==="STALE DATASET")risks.push("ML Ensemble v2 stale dataset");
  }
  if(econ?.risk==="BLACKOUT")risks.push("High-impact macro event blackout");
  else if(econ?.risk==="HIGH"||econ?.risk==="ELEVATED")risks.push(`Macro event risk ${econ.risk}`);
  if(predLiq?.available){
    if(predLiq.state==="UPSIDE LIQUIDITY DENSITY")(dir>0?pos:risks).push(dir>0?"Liquidation model density above price supports squeeze-up context":"Liquidation model density above price opposes short setup");
    else if(predLiq.state==="DOWNSIDE LIQUIDITY DENSITY")(dir<0?pos:risks).push(dir<0?"Liquidation model density below price supports squeeze-down context":"Liquidation model density below price opposes long setup");
  }
  if(histCvd?.available&&histCvd.windowState!=="COMPLETE_WINDOW")risks.push(`Historical CVD ${histCvd.windowState}`);
  if(window.__portfolioV3?.state==="HIGH")risks.push("Portfolio v3 tail/correlation risk HIGH");
  else if(window.__portfolioV3?.state==="NORMAL")pos.push("Portfolio v3 risk normal");
  if(["SEVERE","HIGH"].includes(window.__portfolioStress?.state))risks.push(`Stress test ${window.__portfolioStress.state}`);
  else if(window.__portfolioStress?.state==="NORMAL")pos.push("Stress suite normal");
  if(breadth?.divergence&&breadth.divergence!=="NONE"&&breadth.divergence!=="N/A")risks.push(`Market breadth ${breadth.divergence}`);
  if(breadth&&Number.isFinite(+breadth.score)){const ba=v64BreadthAlignment(ss.tm.direction,breadth);if(ba>=.30)pos.push(`Market breadth ${breadth.state} · ${(+breadth.score).toFixed(0)}/100`);else if(ba<=-.30)risks.push(`Market breadth opposes setup · ${(+breadth.score).toFixed(0)}/100`)}
  if(decision65.killSwitch.state==="NO NEW TRADES")risks.push(`Kill Switch · ${decision65.killSwitch.detail}`);else if(decision65.killSwitch.state==="NORMAL")pos.push("Capital Preservation NORMAL");
  if(decision65.conflict.state==="CLEAR")pos.push(`Conflict Resolver CLEAR · ${decision65.conflict.score.toFixed(0)}/100`);else risks.push(`Conflict Resolver ${decision65.conflict.state}`);
  if(decision65.failure.state==="FAILURE PATTERN MATCH")risks.push("Current setup matches a negative historical pattern");
  if(decision65.eventRisk.state!=="CLEAR")risks.push(`Event Risk ${decision65.eventRisk.state}`);
  if(edge66.decay.state==="SEVERE")risks.push(`v66 severe edge decay · ${edge66.decay.detail}`);else if(edge66.decay.state==="STABLE")pos.push("v66 edge decay stable");
  if(edge66.dna.state==="BLACKLIST")risks.push(`v66 Setup DNA blacklist · N${edge66.dna.current?.n||0}`);else if(edge66.dna.state==="WHITELIST")pos.push(`v66 Setup DNA whitelist · N${edge66.dna.current?.n||0}`);
  if(edge66.sufficiency.state==="LOW")risks.push(`v66 evidence sufficiency LOW · ${edge66.sufficiency.score}/100`);
  if(volIntel?.regime==="EXTREME")risks.push(`Volatility EXTREME · RV20 p${Number.isFinite(volIntel.rvPct)?volIntel.rvPct.toFixed(0):"—"}`);
  else if(volIntel?.regime==="BREAKOUT TRANSITION")risks.push("Volatility breakout transition");
  else if(volIntel?.regime==="EXPANSION")risks.push("Volatility expansion");
  else if(volIntel?.regime==="NORMAL")pos.push("Volatility regime normal");
  else if(volIntel?.regime==="COMPRESSION")pos.push("Volatility compressed · breakout watch not yet triggered");
  const familyOf=name=>({base:"TECH",regime:"TECH",setup:"TECH",structure:"TECH",calibration:"MODEL",meta:"MODEL",governed:"MODEL",flow:"FLOW",liquidations:"FLOW",histCvd:"FLOW",context:"CONTEXT",breadth:"CONTEXT",onchain:"CONTEXT",options:"CONTEXT"}[name]||"OTHER"),familyCaps={TECH:.32,MODEL:.28,FLOW:.22,CONTEXT:.18},familyRows={};for(const x of parts)(familyRows[familyOf(x.name)]??=[]).push(x);
  const familyScores=[];for(const [family,cap] of Object.entries(familyCaps)){const a=familyRows[family]||[],ws=a.reduce((z,x)=>z+x.w,0);if(ws)familyScores.push({family,cap,v:a.reduce((z,x)=>z+x.v*x.w,0)/ws,n:a.length})}const familyCapSum=familyScores.reduce((a,x)=>a+x.cap,0)||1,signed=familyScores.reduce((a,x)=>a+x.v*x.cap,0)/familyCapSum,score=50+50*signed,evidence=parts.filter(x=>Math.abs(x.v)>=.15&&x.v*dir>0).length+"/"+parts.length;window.__masterFamilyScores=familyScores;
  const metaUsable=String(meta.state||"").startsWith("USABLE"),gates=[],gate=(code,why,unlock)=>gates.push({code,why,unlock});
  if(!dir)gate("BASE_WAIT","Motorul de bază este WAIT.","Motorul de bază trebuie să confirme LONG sau SHORT.");
  if(meta.action==="SKIP"&&metaUsable)gate("META_SKIP","Meta-label-ul utilizabil spune SKIP.","Meta-label-ul trebuie să treacă din SKIP în TRADE.");
  if(["BLOCK","PAUSE"].includes(budget))gate("PORTFOLIO_GATE",`Portfolio gate este ${budget}.`,"Portfolio gate trebuie să revină PASS/WATCH înainte de activarea setup-ului.");
  if(econ?.risk==="BLACKOUT")gate("MACRO_BLACKOUT","Există blackout macro pentru un eveniment cu impact mare.","Așteaptă ieșirea din fereastra macro BLACKOUT și rulează din nou analiza.");
  if(window.__portfolioStress?.state==="SEVERE")gate("STRESS_SEVERE","Stress suite este SEVERE.","Stress suite trebuie să iasă din starea SEVERE.");
  if(guard?.state==="BLOCK"||guard?.mult===0)gate("RISK_GUARD","Risk Guard blochează riscul.","Risk Guard trebuie să permită un multiplicator de risc > 0.");
  if(decision65.killSwitch.state==="NO NEW TRADES")gate("KILL_SWITCH_V65",`Capital Preservation: ${decision65.killSwitch.detail}`,"Kill Switch trebuie să revină CAUTION/NORMAL înainte de orice intrare nouă.");
  if(decision65.conflict.state==="HIGH CONFLICT")gate("SIGNAL_CONFLICT_V65",`Conflict Resolver: ${decision65.conflict.detail}`,"Așteaptă retest/confirmare până când conflictul scade sub HIGH CONFLICT.");
  if(edge66.hardBlock)gate("EDGE_VALIDATION_V66",`v66 evidence gate: ${edge66.hardReasons.join(", ")}.`,"Așteaptă recuperarea edge-ului sau suficiente rezultate noi care scot Setup DNA din blacklist; sample-urile mici nu blochează.");
  if(ops67?.hardBlock)gate("OPERATIONS_V67",`Operations ${ops67.state}: ${ops67.reasons.join(", ")}.`,`Restabilește starea operațională și rulează watchdog/reconciliation înainte de o intrare nouă.`);
  if(life?.state==="RETIRED")gate("LIFECYCLE_RETIRED","Strategy lifecycle este RETIRED.","Strategia nu trebuie să fie în starea RETIRED.");
  if(quality<55)gate("DATA_QUALITY",`Data quality este ${quality.toFixed(0)}/100.`,`Data quality trebuie să fie cel puțin 55/100; ideal peste 70/100.`);
  if(Math.abs(signed)<.12)gate("EDGE_WEAK",`Consensul family-capped este ${(Math.abs(signed)*100).toFixed(0)}/100, sub pragul 12.`,`Consensul family-capped trebuie să depășească pragul de 12/100 în direcția setup-ului.`);
  let verdict=dir>0?"LONG":dir<0?"SHORT":"WAIT",blocker=gates.length>0;if(blocker)verdict="WAIT";
  if(meta.action==="SKIP"&&metaUsable)risks.push("Meta-label says SKIP");if(budget==="BLOCK")risks.push("Portfolio risk budget BLOCK");if(quality<55)risks.push("Data quality below gate");if(reg?.state==="HIGH_VOL")risks.push("High-volatility regime");
  $("masterVerdict").textContent=verdict;$("masterVerdict").className="big "+(verdict==="LONG"?"good":verdict==="SHORT"?"bad":"neutral");$("masterScore").textContent=score.toFixed(0)+"/100";$("masterEvidence").textContent=evidence;$("masterRegime").textContent=reg?`${reg.state} ${(reg.confidence*100).toFixed(0)}%`:"—";$("masterMeta").textContent=Number.isFinite(meta.p)?`${meta.action} ${(meta.p*100).toFixed(0)}%`:meta.action;const mv2=metaEnsembleV2?.models?ensembleCurrentPrediction():null;$("masterEnsembleV2").textContent=mv2?`${mv2.state} · ${Number.isFinite(mv2.disagreement)?(mv2.disagreement*100).toFixed(0)+"pp":"—"}`:"N/A";$("masterCalibrated").textContent=cal?(cal.p*100).toFixed(0)+"%":"—";$("masterFlow").textContent=flow&&!flow.error?`${flow.state} ${flow.delta>=0?"+":""}${flow.delta.toFixed(0)}%`:"N/A";$("masterLiquidation").textContent=heat.rows.length?(heat.long>heat.short?"LONGS hit":"SHORTS hit")+" · "+compact(heat.long+heat.short):"N/A";$("masterSetup").textContent=sq?`${sq.grade} · ${sq.overall.toFixed(0)}/100`:"—";$("masterRisk").textContent=`${budget}${window.__portfolioStress?" · stress "+window.__portfolioStress.state:""}`;$("masterModel").textContent=activeModelVersionId?`#${String(activeModelVersionId).slice(-6)}`:(metaLabelState?.state||mlShadow?.state||"BASE");$("masterGovernance").textContent=`${Number.isFinite(gov?.ensemble)?(gov.ensemble*100).toFixed(0)+"%":"N/A"} · ${driftSnapshot?.state||"no drift test"}`;$("masterContext").textContent=Number.isFinite(context)?context.toFixed(0)+"/100":"N/A";$("masterStructure").textContent=structure?.sweep?`${structure.sweep.type} · ${(+structure.sweep.score||0).toFixed(0)}`:"N/A";$("masterVolatility").textContent=volIntel?`${volIntel.regime} · RVp ${Number.isFinite(volIntel.rvPct)?volIntel.rvPct.toFixed(0):"—"} · ${volIntel.riskMultiplier.toFixed(2)}×`:"N/A";$("masterCalendar").textContent=econ?.available?`${econ.risk}${Number.isFinite(econ.mins)?" · "+extMinsText(econ.mins):""}`:(ext.calendar?.configured===false?"CONFIGURE":"N/A");$("masterOnchain").textContent=Number.isFinite(onchain?.contextScore)?`${onchain.contextScore.toFixed(0)}/100 · ${onchain?.whales?.available?"flows":"network"}`:"N/A";$("masterPredLiq").textContent=predLiq?.available?predLiq.state:"N/A";$("masterOptions").textContent=opt?.available?`${opt.context?.state||"BALANCED"} · PCR ${Number.isFinite(+opt.putCallOiRatio)?(+opt.putCallOiRatio).toFixed(2):"—"}`:"N/A";$("masterHistCvd").textContent=histCvd?.available?`${histCvd.summary?.state||"—"} · ${Number.isFinite(+histCvd.coverage)?(+histCvd.coverage*100).toFixed(0)+"%":"—"}`:"N/A";$("masterBreadth").textContent=breadth&&Number.isFinite(+breadth.score)?`${breadth.state} · ${(+breadth.score).toFixed(0)}/100 · ${breadth.n}/${breadth.total}`:"N/A";$("masterDecisionOS").textContent=`${decision65.summary.state} · ${decision65.summary.quality.toFixed(0)}/100`;$("masterKillSwitch").textContent=decision65.killSwitch.state;$("masterKillSwitch").className=decision65.killSwitch.state==="NO NEW TRADES"?"bad":decision65.killSwitch.state==="CAUTION"?"neutral":"good";$("masterEdgeV66").textContent=`${edge66.state} · ${edge66.quality.score}/100`;$("masterEdgeV66").className=edge66.hardBlock?"bad":edge66.quality.score>=75?"good":"neutral";$("masterDnaV66").textContent=`${edge66.dna.state} · N${edge66.dna.current?.n||0}`;$("masterDnaV66").className=edge66.dna.state==="BLACKLIST"?"bad":edge66.dna.state==="WHITELIST"?"good":"neutral";$("masterSuffV66").textContent=`${edge66.sufficiency.state} · ${edge66.sufficiency.score}/100`;if($("masterOpsV67")){$("masterOpsV67").textContent=ops67?`${ops67.state} · ${ops67.score}/100`:"N/A";$("masterOpsV67").className=ops67?.hardBlock?"bad":ops67?.state==="DEGRADED"?"neutral":"good"}$("masterData").textContent=quality.toFixed(0)+"/100";
  $("masterPositives").innerHTML=pos.length?pos.slice(0,8).map(x=>verdictChip(x,"reasonGood")).join(""):verdictChip("No strong aligned evidence","reasonWarn");$("masterRisks").innerHTML=risks.length?[...new Set(risks)].slice(0,8).map(x=>verdictChip(x,"reasonBad")).join(""):verdictChip("No major blocker detected","reasonGood");
  const tm=ss.tm,planReady=Number.isFinite(+tm.entryLow)&&Number.isFinite(+tm.entryHigh)&&Number.isFinite(+tm.stop);$("masterTradeMap").textContent=planReady?(verdict==="WAIT"?`WAIT · candidat ${ss.tm.direction} INACTIV · ${decision65.entry.action} · Stop ${num(tm.stop)} · TP1 ${num(tm.tp1)} · TP2 ${num(tm.tp2)}`:`${verdict} · ${decision65.entry.action} · Stop ${num(tm.stop)} · TP1 ${num(tm.tp1)} · TP2 ${num(tm.tp2)} · TP3 ${num(tm.tp3)} · Exit: ${decision65.exit.action}`):`${verdict} · plan indisponibil`;
  $("masterAction").textContent=verdict==="WAIT"?"WAIT explicat mai sus: verifică blocker-ele și condițiile de deblocare.":"Setup research/paper trece gate-urile family-capped; probabilitatea calibrată rămâne separată și nu este o garanție.";window.__masterVerdict={verdict,score,signed,scoreType:"HEURISTIC_FAMILY_CAPPED",families:window.__masterFamilyScores,evidence,budget,quality,gates:gates.map(g=>g.code),decisionOS:decision65.summary,killSwitch:decision65.killSwitch.state,adaptiveEntry:decision65.entry.state,dynamicExit:decision65.exit.state,edgeValidationV66:{state:edge66.state,score:edge66.score,dna:edge66.dna.state,decay:edge66.decay.state,sufficiency:edge66.sufficiency.score},operationsV67:ops67?{state:ops67.state,score:ops67.score,hardBlock:ops67.hardBlock,reasons:ops67.reasons}:null,volatility:volIntel?{regime:volIntel.regime,rvPct:volIntel.rvPct,riskMultiplier:volIntel.riskMultiplier}:null,ts:Date.now()};const vc=renderVerdictCenter();window.__masterVerdict.explanation=renderVerdictExplainer({verdict,dir,score,signed,quality,meta,cal,budget,econ,guard,life,ss,sq,gates,risks,pos,vc});renderProfitReadiness(false);renderV65DecisionOS(false);renderV66EdgeValidation(false);if(typeof renderV67Operations==="function")renderV67Operations(false);return window.__masterVerdict
}
async function renderDecisionCore(){
  renderRegimeV2();renderMetaLabel();renderMetaEnsembleV2();renderCalibrationV2();renderTrueTradeFlow();renderObservedLiquidationHeatmap();renderModelVersions();renderMasterVerdict();if(assetClass()==="CRYPTO"){ensureLiquidationTape();await loadTrueTradeFlow(false).catch(()=>{})}
}
function updateDecisionCoreAfterAnalysis(){
  renderRegimeV2();const mlN=mlDataset().length;if(!metaLabelState&&mlN>=70)runAutoTrainingLocked("meta",()=>trainMetaLabelModel()).catch(()=>{});else renderMetaLabel();if(!metaEnsembleV2?.models&&mlN>=90)runAutoTrainingLocked("ensemble",()=>trainMetaEnsembleV2(false)).catch(()=>{});else renderMetaEnsembleV2();renderCalibrationV2();renderModelVersions();renderObservedLiquidationHeatmap();renderMasterVerdict();archiveDecisionSnapshot().catch(()=>{});
  if(assetClass()==="CRYPTO"){ensureLiquidationTape();loadTrueTradeFlow(false).catch(()=>{});loadExternalIntelligence(false).catch(()=>{})}else loadEconomicCalendar(false).catch(()=>{})
}

const COMMANDS=[
  ["Dashboard","dash"],["Edge Validation Pro","edgepro"],["Scanner","scan"],["Replay & Historical Scanner","replaylab"],["Decision Core","decisioncore"],["Profit Readiness","profitready"],["Volatility Intelligence","volatilitylab"],["Local Data & Reports","localdata"],["Research ML","researchml"],["Portfolio Intelligence","portfolio"],["Market Profile","profilelab"],["Structure & Sessions","structurelab"],["Context Intelligence","intel"],["Paper Trading v3","paper"],["Health","health"],["Settings","settings"]
];
function toggleCommandPalette(force){const p=$("commandPalette"),on=force==null?!p.classList.contains("on"):!!force;p.classList.toggle("on",on);if(on){dialogReturnFocus=document.activeElement;$("commandInput").value="";renderCommandPalette();setTimeout(()=>$("commandInput").focus(),0)}else restoreDialogFocus()}
function renderCommandPalette(){const q=($("commandInput")?.value||"").toLowerCase(),rows=COMMANDS.filter(x=>x[0].toLowerCase().includes(q));$("commandItems").innerHTML=rows.map(([n,id])=>`<div class="cmdItem" data-action-click="toggleCommandPalette(false);navTo(&#x27;${id}&#x27;,${["scan","replaylab","decisioncore","volatilitylab","localdata","portfolio","profilelab","structurelab","intel"].includes(id)})">${n}</div>`).join("")}

const LOCAL_DB_NAME="CryptoRadarResearch";
const LOCAL_DB_VERSION=54;
const LOCAL_DATA_SETTINGS_KEY="localDataSettingsV48";
let localDbPromise=null,currentResearchReport=null,lastLocalArchiveWrite=0,lastDecisionArchiveKey="",lastDecisionArchiveTs=0,lastLiqDbArchiveTs=0;

function localDataSettings(){
  try{return {...{retentionDays:365,maxPerType:10000},...JSON.parse(localStorage.getItem(LOCAL_DATA_SETTINGS_KEY)||"{}")}}catch{return {retentionDays:365,maxPerType:10000}}
}
function saveLocalDataSettings(){
  const x={retentionDays:Math.max(30,Math.min(3650,+$("localRetentionDays")?.value||365)),maxPerType:Math.max(500,Math.min(50000,+$("localMaxPerType")?.value||10000))};
  localStorage.setItem(LOCAL_DATA_SETTINGS_KEY,JSON.stringify(x));return x
}
function localDbSupported(){return typeof indexedDB!=="undefined"}
function localDbOpen(){
  if(appSettings().privacySessionOnly)return Promise.reject(Error("IndexedDB disabled by session-only privacy mode"));
  if(!localDbSupported())return Promise.reject(Error("IndexedDB unavailable"));
  if(localDbPromise)return localDbPromise;
  localDbPromise=new Promise((resolve,reject)=>{
    const req=indexedDB.open(LOCAL_DB_NAME,LOCAL_DB_VERSION);
    req.onupgradeneeded=()=>{
      const db=req.result;
      if(!db.objectStoreNames.contains("records")){
        const st=db.createObjectStore("records",{keyPath:"key"});st.createIndex("type","type",{unique:false});st.createIndex("ts","ts",{unique:false});st.createIndex("typeTs",["type","ts"],{unique:false})
      }else{
        const st=req.transaction.objectStore("records");if(!st.indexNames.contains("type"))st.createIndex("type","type",{unique:false});if(!st.indexNames.contains("ts"))st.createIndex("ts","ts",{unique:false});if(!st.indexNames.contains("typeTs"))st.createIndex("typeTs",["type","ts"],{unique:false})
      }
      if(!db.objectStoreNames.contains("reports")){
        const st=db.createObjectStore("reports",{keyPath:"id"});st.createIndex("ts","ts",{unique:false});st.createIndex("period","period",{unique:false})
      }
      if(!db.objectStoreNames.contains("meta"))db.createObjectStore("meta",{keyPath:"key"})
    };
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>{localDbPromise=null;reject(req.error||Error("IndexedDB open failed"))};req.onblocked=()=>{localDbPromise=null;reject(Error("IndexedDB upgrade blocked"))}
  });return localDbPromise
}
async function localDbPutRecord(type,id,data,ts=Date.now()){
  if(appSettings().privacySessionOnly)return false;try{const db=await localDbOpen();await new Promise((resolve,reject)=>{const tx=db.transaction("records","readwrite"),st=tx.objectStore("records");st.put({key:`${type}|${id}`,type,id:String(id),ts:+ts||Date.now(),data});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});lastLocalArchiveWrite=Date.now();return true}catch{return false}
}
async function localDbPutMany(type,rows,idFn=x=>x.id,tsFn=x=>x.ts){
  if(appSettings().privacySessionOnly)return false;if(!rows?.length)return true;try{const db=await localDbOpen();await new Promise((resolve,reject)=>{const tx=db.transaction("records","readwrite"),st=tx.objectStore("records");for(const x of rows){const id=idFn(x);if(id==null)continue;st.put({key:`${type}|${id}`,type,id:String(id),ts:+tsFn(x)||Date.now(),data:x})}tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});lastLocalArchiveWrite=Date.now();return true}catch{return false}
}
async function localDbRecords(type,since=0,limit=10000){
  try{
    const db=await localDbOpen();return await new Promise((resolve,reject)=>{
      const tx=db.transaction("records","readonly"),idx=tx.objectStore("records").index("typeTs"),range=IDBKeyRange.bound([type,+since||0],[type,Number.MAX_SAFE_INTEGER]),req=idx.openCursor(range,"next"),out=[];
      req.onsuccess=()=>{const c=req.result;if(!c||out.length>=limit){resolve(out);return}out.push(c.value);c.continue()};req.onerror=()=>reject(req.error)
    })
  }catch{return []}
}
async function localDbAllRecords(limit=100000){
  try{const db=await localDbOpen();return await new Promise((resolve,reject)=>{const req=db.transaction("records","readonly").objectStore("records").openCursor(null,"next"),out=[];req.onsuccess=()=>{const c=req.result;if(!c||out.length>=limit){resolve(out);return}out.push(c.value);c.continue()};req.onerror=()=>reject(req.error)})}catch{return []}
}
async function localDbCount(type){
  try{const db=await localDbOpen();return await new Promise((resolve,reject)=>{const req=db.transaction("records","readonly").objectStore("records").index("type").count(IDBKeyRange.only(type));req.onsuccess=()=>resolve(req.result||0);req.onerror=()=>reject(req.error)})}catch{return 0}
}
async function localDbMetaGet(key){
  try{const db=await localDbOpen();return await new Promise((resolve,reject)=>{const req=db.transaction("meta","readonly").objectStore("meta").get(key);req.onsuccess=()=>resolve(req.result?.value);req.onerror=()=>reject(req.error)})}catch{return null}
}
async function localDbMetaSet(key,value){
  if(appSettings().privacySessionOnly)return false;try{const db=await localDbOpen();await new Promise((resolve,reject)=>{const tx=db.transaction("meta","readwrite");tx.objectStore("meta").put({key,value});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});return true}catch{return false}
}
async function localReportPut(report){
  if(appSettings().privacySessionOnly)return false;try{const db=await localDbOpen();await new Promise((resolve,reject)=>{const tx=db.transaction("reports","readwrite");tx.objectStore("reports").put(report);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});return true}catch{return false}
}
async function localReportsAll(limit=100){
  try{const db=await localDbOpen();return await new Promise((resolve,reject)=>{const req=db.transaction("reports","readonly").objectStore("reports").index("ts").openCursor(null,"prev"),out=[];req.onsuccess=()=>{const c=req.result;if(!c||out.length>=limit){resolve(out);return}out.push(c.value);c.continue()};req.onerror=()=>reject(req.error)})}catch{return []}
}
async function localReportGet(id){
  try{const db=await localDbOpen();return await new Promise((resolve,reject)=>{const req=db.transaction("reports","readonly").objectStore("reports").get(id);req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error)})}catch{return null}
}
async function localDbTrimType(type,cutoff,maxN){
  try{
    const rows=await localDbRecords(type,0,Math.max(maxN*3,50000)),remove=rows.filter(x=>x.ts<cutoff);const keep=rows.filter(x=>x.ts>=cutoff),extra=Math.max(0,keep.length-maxN);remove.push(...keep.slice(0,extra));if(!remove.length)return 0;
    const db=await localDbOpen();await new Promise((resolve,reject)=>{const tx=db.transaction("records","readwrite"),st=tx.objectStore("records");for(const x of remove)st.delete(x.key);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});return remove.length
  }catch{return 0}
}
function archiveSignalRows(rows){return localDbPutMany("signals",rows,x=>x.id||`${x.ts}|${x.symbol}|${x.tf}|${x.direction}`,x=>x.ts)}
function archivePaperRows(rows){return localDbPutMany("paper",rows,x=>x.id||`${x.created||x.ts}|${x.symbol}`,x=>x.created||x.ts||Date.now())}
function archiveExperimentRows(rows){return localDbPutMany("experiments",rows,x=>x.id,x=>x.created||x.id)}
function archiveModelRows(rows){return localDbPutMany("models",rows,x=>x.id,x=>x.created||x.id)}
async function hydrateLiquidationArchive(){
  try{
    const since=Date.now()-7*86400000,rows=(await localDbRecords("liquidations",since,25000)).map(x=>x.data).filter(x=>x&&Number.isFinite(+x.ts));
    if(!rows.length)return {loaded:0};
    const m=new Map();for(const x of [...liqEvents,...rows]){const k=`${+x.ts}|${x.symbol||""}|${x.side||""}|${+x.price||0}|${+x.qty||+x.notional||0}`;m.set(k,x)}
    liqEvents=[...m.values()].filter(x=>+x.ts>=since).sort((a,b)=>+a.ts-+b.ts).slice(-20000);persistObservedLiquidations();return {loaded:rows.length,total:liqEvents.length}
  }catch{return {loaded:0,total:liqEvents?.length||0}}
}
async function migrateLocalDataV54(){
  if(!localDbSupported())return {state:"FALLBACK",migrated:false};
  const done=await localDbMetaGet("migration-v54");if(done)return {state:"DONE",migrated:false,ts:done};
  await archiveSignalRows(journal());await archivePaperRows(paperTrades());await archiveExperimentRows(experimentRegistry());await archiveModelRows(modelVersions());
  if(liqEvents?.length)await localDbPutMany("liquidations",liqEvents,x=>`${x.ts}|${x.symbol}|${x.price}|${x.side}`,x=>x.ts);
  const ts=Date.now();await localDbMetaSet("migration-v54",ts);await localDbMetaSet("schema-migrations",{current:54,completed:[48,49,50,51,52,53,54],ts});return {state:"DONE",migrated:true,ts}
}
async function localArchiveMerged(type,fallback=[]){
  const archived=(await localDbRecords(type,0,20000)).map(x=>x.data),m=new Map();for(const x of [...archived,...fallback]){const id=x.id??`${x.ts||x.created||0}|${x.symbol||""}|${x.tf||""}|${x.direction||""}`;m.set(String(id),x)}return [...m.values()].sort((a,b)=>(+a.ts||+a.created||0)-(+b.ts||+b.created||0))
}
async function runLocalRetention(){
  const cfg=saveLocalDataSettings(),cutoff=Date.now()-cfg.retentionDays*86400000,types=["signals","paper","research_cohort","scanner_runs","snapshots","experiments","decisions","models", "liquidations","trade_flow","external_intel","verdict_center","volatility_intel","profit_readiness","historical_replay","historical_scans","paper_v3","portfolio_risk","stress_tests","edge_drift_v61","champion_challenger_v61","provider_health_v62","live_readiness_v63","market_breadth_v64","decision_intel_v65","edge_validation_v66","ops_heartbeat_v67","ops_incidents_v67","live_execution_v68","live_performance_v69","pionex_journal_v71"],removed={};
  for(const t of types)removed[t]=await localDbTrimType(t,cutoff,cfg.maxPerType);
  await localDbMetaSet("last-retention",{ts:Date.now(),cfg,removed});await refreshLocalDataPanel();toast(`Local retention cleanup · ${Object.values(removed).reduce((a,b)=>a+b,0)} removed`,"good")
}
async function localStorageEstimate(){
  try{const e=await navigator.storage?.estimate?.();if(!e)return null;return {usage:+e.usage||0,quota:+e.quota||0}}catch{return null}
}
async function refreshLocalDataPanel(){
  const cfg=localDataSettings();if($("localRetentionDays"))$("localRetentionDays").value=cfg.retentionDays;if($("localMaxPerType"))$("localMaxPerType").value=cfg.maxPerType;
  const ok=localDbSupported();$("localDbState").textContent=ok?"READY":"UNAVAILABLE";$("localDbState").className=ok?"syncReady":"syncBad";
  const mig=await localDbMetaGet("migration-v54");$("localMigration").textContent=mig?new Date(mig).toLocaleString():(ok?"PENDING":"FALLBACK");
  const pairs=[["signals","localSignals"],["paper","localPaper"],["paper_v3","localPaperV3"],["scanner_runs","localScans"],["snapshots","localSnapshots"],["experiments","localExperiments"],["decisions","localDecisions"],["verdict_center","localVerdictCenter"],["profit_readiness","localProfitReadiness"],["historical_replay","localHistoricalReplay"],["historical_scans","localHistoricalScans"],["volatility_intel","localVolatilityIntel"],["external_intel","localExternalIntel"],["portfolio_risk","localPortfolioRisk"],["stress_tests","localStressTests"],["edge_drift_v61","localEdgeDriftV61"],["champion_challenger_v61","localChampionChallengerV61"],["provider_health_v62","localProviderHealthV62"],["live_readiness_v63","localLiveReadinessV63"],["market_breadth_v64","localBreadthV64"],["decision_intel_v65","localDecisionV65"],["edge_validation_v66","localEdgeV66"],["ops_heartbeat_v67","localOpsV67"],["live_execution_v68","localLiveV68"],["live_performance_v69","localLiveV69"],["pionex_journal_v71","localPionexV71"],["models","localModels"]];
  for(const [t,id] of pairs)$(id).textContent=await localDbCount(t);
  $("localReports").textContent=(await localReportsAll(500)).length;$("localLastWrite").textContent=lastLocalArchiveWrite?new Date(lastLocalArchiveWrite).toLocaleTimeString():"—";$("localIntegrity").textContent=ok?"KEYED + DEDUPED":"WORKING-SET ONLY";
  const est=await localStorageEstimate();$("localStorageEstimate").textContent=est?`${(est.usage/1048576).toFixed(1)} MB / ${(est.quota/1073741824).toFixed(1)} GB`:"N/A";$("localSyncReady").textContent=ok?"SCHEMA READY":"NO IDB";$("localSyncReady").className=ok?"syncReady":"syncWarn";renderReportHistory()
}

function localDateKey(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
function periodWindow(period,now=Date.now()){
  const d=new Date(now),end=now;period=String(period||"DAILY").toUpperCase();
  if(period==="DAILY"){const st=new Date(d);st.setHours(0,0,0,0);return {period,start:+st,end,key:localDateKey(st)}}
  if(period==="WEEKLY"){const st=new Date(d);st.setHours(0,0,0,0);const day=(st.getDay()+6)%7;st.setDate(st.getDate()-day);return {period,start:+st,end,key:localDateKey(st)}}
  const st=new Date(d.getFullYear(),d.getMonth(),1);return {period:"MONTHLY",start:+st,end,key:`${st.getFullYear()}-${String(st.getMonth()+1).padStart(2,"0")}`}
}
function reportContextGroups(rows){
  const g={};for(const x of rows){const k=`${x.tf||"?"} · ${canonicalRegime(x)} · ${x.direction||"?"}`;(g[k]??=[]).push(x)}
  const out=Object.entries(g).map(([name,a])=>{const st=statsRows(a);return {name,n:a.length,avg:st.avg,pf:st.pf,win:st.win}}).filter(x=>x.n>=3).sort((a,b)=>b.avg-a.avg);return {best:out[0]||null,worst:out.at(-1)||null,all:out}
}
function reportDataQuality(rows){
  if(!rows.length)return 0;const fields=["trendScore","momScore","volScore","structureScore","adx","atrPct"],ok=rows.reduce((a,x)=>a+fields.filter(k=>Number.isFinite(+x[k])).length,0);return ok/(rows.length*fields.length)*100
}
async function sha256Text(text){if(!globalThis.crypto?.subtle)throw Error("SHA-256 unavailable in this browser context");const b=new TextEncoder().encode(text),h=await crypto.subtle.digest("SHA-256",b);return [...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,"0")).join("")}
async function buildResearchReport(period="DAILY"){
  const w=periodWindow(period),signals=(await localArchiveMerged("signals",journal())).filter(x=>(+x.ts||0)>=w.start&&(+x.ts||0)<=w.end),resolved=signals.map(x=>({...x,r:metricR(x)})).filter(x=>Number.isFinite(x.r)),paper=(await localArchiveMerged("paper",paperTrades())).filter(x=>(+x.created||+x.ts||0)>=w.start),scans=(await localDbRecords("scanner_runs",w.start,5000)).map(x=>x.data),experiments=(await localArchiveMerged("experiments",experimentRegistry())).filter(x=>(+x.created||0)>=w.start),decisions=(await localDbRecords("decisions",w.start,5000)).map(x=>x.data),verdictCenterRows=(await localDbRecords("verdict_center",w.start,5000)).map(x=>x.data),readinessRows=(await localDbRecords("profit_readiness",w.start,5000)).map(x=>x.data),replayRows=(await localDbRecords("historical_replay",w.start,10000)).map(x=>x.data),historicalScans=(await localDbRecords("historical_scans",w.start,5000)).map(x=>x.data),paperV3Rows=(await localDbRecords("paper_v3",w.start,5000)).map(x=>x.data),externalIntel=(await localDbRecords("external_intel",w.start,5000)).map(x=>x.data),volatilityIntel=(await localDbRecords("volatility_intel",w.start,5000)).map(x=>x.data),portfolioRisk=(await localDbRecords("portfolio_risk",w.start,5000)).map(x=>x.data),stressTests=(await localDbRecords("stress_tests",w.start,5000)).map(x=>x.data),stats=statsRows(resolved),paperPnl=paper.reduce((a,x)=>a+(Number.isFinite(+x.realizedUsd)?+x.realizedUsd:0),0),ctx=reportContextGroups(resolved),quality=reportDataQuality(signals),positive=Number.isFinite(stats.avg)&&stats.avg>0&&stats.pf>=1,headline=resolved.length<5?"LOW SAMPLE":positive?"POSITIVE OBSERVED EDGE":"MIXED / WEAK";
  const extLatest={};for(const x of externalIntel)if(x?.type)extLatest[x.type]=x.data;
  const report={id:`${w.period}:${w.key}`,schemaVersion:54,period:w.period,key:w.key,start:w.start,end:w.end,ts:Date.now(),headline,
    signals:{total:signals.length,resolved:resolved.length,win:stats.win,avg:stats.avg,pf:stats.pf,dd:stats.dd},
    paper:{count:paper.length,realizedUsd:paperPnl},scanner:{runs:scans.length},experiments:{count:experiments.length,candidates:experiments.filter(x=>x.status==="CANDIDATE"||x.status==="PROMOTED").length},
    decisions:{count:decisions.length,long:decisions.filter(x=>x.verdict==="LONG").length,short:decisions.filter(x=>x.verdict==="SHORT").length,wait:decisions.filter(x=>x.verdict==="WAIT").length},
    verdictCenter:{count:verdictCenterRows.length,latest:verdictCenterRows.at(-1)||window.__verdictCenter||null,avgAgreement:(()=>{const a=verdictCenterRows.map(x=>+x.agreement).filter(Number.isFinite);return a.length?a.reduce((u,v)=>u+v,0)/a.length:null})(),avgCoverage:(()=>{const a=verdictCenterRows.map(x=>+x.coverage).filter(Number.isFinite);return a.length?a.reduce((u,v)=>u+v,0)/a.length:null})()},
    profitReadiness:{count:readinessRows.length,latest:readinessRows.at(-1)||window.__profitReadiness||null,smallLiveCount:readinessRows.filter(x=>x.state==="SMALL LIVE READY").length,paperReadyCount:readinessRows.filter(x=>x.state==="PAPER READY").length},replay:{frames:replayRows.length,scans:historicalScans.length,latestScan:historicalScans.at(-1)||null},paperV3:{count:paperV3Rows.length,latest:paperV3Rows.at(-1)||null,avgCosts:(()=>{const a=paperV3Rows.map(x=>+x.costUsd).filter(Number.isFinite);return a.length?a.reduce((u,v)=>u+v,0)/a.length:null})()},
    portfolioV3:{count:portfolioRisk.length,latest:portfolioRisk.at(-1)||null,stressCount:stressTests.length,latestStress:stressTests.at(-1)||null},
    externalIntel:{count:externalIntel.length,calendar:externalIntelState.calendar?.summary?.risk||extLatest.calendar?.summary?.risk||null,onchain:externalIntelState.onchain?.contextScore??extLatest.onchain?.contextScore??null,predLiq:externalIntelState.predLiq?.summary?.state||extLatest.predictive_liquidation?.summary?.state||null,options:externalIntelState.options?.context?.state||extLatest.options?.context?.state||null,histCvd:externalIntelState.histCvd?.summary?.state||extLatest.historical_cvd?.summary?.state||null,histCvdCoverage:externalIntelState.histCvd?.coverage??extLatest.historical_cvd?.coverage??null},
    volatility:{count:volatilityIntel.length,latest:volatilityIntel.at(-1)||window.__volatilityIntel||null,avgRvPct:(()=>{const a=volatilityIntel.map(x=>+x.rvPct).filter(Number.isFinite);return a.length?a.reduce((u,v)=>u+v,0)/a.length:null})(),extremeCount:volatilityIntel.filter(x=>x.regime==="EXTREME").length,breakoutCount:volatilityIntel.filter(x=>x.regime==="BREAKOUT TRANSITION").length},
    governance:{calibrationState:calibrationV2State?.state||null,calibratedProbability:calibrationV2State?.p??null,drift:driftSnapshot?.state||null,meta:metaLabelState?.state||null,metaEnsembleV2:metaEnsembleV2?.state||null,metaDisagreement:ensembleCurrentPrediction()?.disagreement??null,shadow:mlShadow?.state||null},
    contexts:ctx,dataQuality:quality,source:analysisSource(),market:assetClass(),master:window.__masterVerdict||null};
  const unsigned=JSON.stringify(report);report.checksum=await sha256Text(unsigned);return report
}
async function generateResearchReport(showToast=false,periodOverride=null){
  const period=periodOverride||$("reportPeriod")?.value||"DAILY",r=await buildResearchReport(period);currentResearchReport=r;await localReportPut(r);renderResearchReport(r);renderReportHistory();if(showToast)toast(`${period} research report generated`,"good");return r
}
function reportMetric(v,d=2,suffix=""){return Number.isFinite(+v)?(+v).toFixed(d)+suffix:"—"}
function renderResearchReport(r){
  if(!r)return;$("reportHeadline").textContent=r.headline;$("reportPeriodLabel").textContent=`${r.period} · ${new Date(r.start).toLocaleDateString()} → ${new Date(r.end).toLocaleString()}`;$("reportSignals").textContent=r.signals.resolved;$("reportExpectancy").textContent=reportMetric(r.signals.avg,2," R");$("reportPf").textContent=reportMetric(r.signals.pf,2);$("reportWin").textContent=Number.isFinite(r.signals.win)?(r.signals.win*100).toFixed(0)+"%":"—";$("reportPaperPnl").textContent=money(r.paper.realizedUsd);$("reportScannerRuns").textContent=r.scanner.runs;$("reportExperiments").textContent=r.experiments.count;$("reportDecisions").textContent=r.decisions.count;$("reportGovernance").textContent=`${r.governance.calibrationState||"—"} · ${r.governance.drift||"—"}`;$("reportBestContext").textContent=r.contexts.best?`${r.contexts.best.name} · ${r.contexts.best.avg.toFixed(2)}R`:"—";$("reportAvoidContext").textContent=r.contexts.worst?`${r.contexts.worst.name} · ${r.contexts.worst.avg.toFixed(2)}R`:"—";$("reportQuality").textContent=r.dataQuality.toFixed(0)+"/100";$("reportChecksum").textContent=(r.checksum||"—").slice(0,14);
  const ctxRows=r.contexts.all.slice(0,8).map(x=>`<div class="row"><span>${x.name} · N${x.n}</span><b class="${x.avg>=0?"good":"bad"}">${x.avg.toFixed(2)}R · PF ${x.pf.toFixed(2)}</b></div>`).join("");
  $("reportBody").innerHTML=`<div class="reportSection"><h4>Performance</h4><div class="row"><span>Resolved / total signals</span><b>${r.signals.resolved}/${r.signals.total}</b></div><div class="row"><span>Expectancy</span><b>${reportMetric(r.signals.avg,2," R")}</b></div><div class="row"><span>Profit factor</span><b>${reportMetric(r.signals.pf,2)}</b></div><div class="row"><span>Drawdown proxy</span><b>${reportMetric(r.signals.dd,2," R")}</b></div><div class="row"><span>Paper realized</span><b>${money(r.paper.realizedUsd)}</b></div></div><div class="reportSection"><h4>Research operations</h4><div class="row"><span>Scanner runs</span><b>${r.scanner.runs}</b></div><div class="row"><span>Experiments</span><b>${r.experiments.count}</b></div><div class="row"><span>Candidate/promoted</span><b>${r.experiments.candidates}</b></div><div class="row"><span>Decision snapshots</span><b>${r.decisions.count}</b></div><div class="row"><span>Verdict Center snapshots</span><b>${r.verdictCenter?.count||0}</b></div><div class="row"><span>Avg module agreement</span><b>${Number.isFinite(r.verdictCenter?.avgAgreement)?r.verdictCenter.avgAgreement.toFixed(0)+"%":"—"}</b></div><div class="row"><span>Profit readiness</span><b>${r.profitReadiness?.latest?.state||"—"}</b></div><div class="row"><span>Replay frames</span><b>${r.replay?.frames||0}</b></div><div class="row"><span>Historical scans</span><b>${r.replay?.scans||0}</b></div><div class="row"><span>Paper v3 snapshots</span><b>${r.paperV3?.count||0}</b></div><div class="row"><span>Paper v3 active positions</span><b>${r.paperV3?.latest?.positions??"—"}</b></div><div class="row"><span>Readiness gate coverage</span><b>${Number.isFinite(+r.profitReadiness?.latest?.coverage)?(+r.profitReadiness.latest.coverage).toFixed(0)+"%":"—"}</b></div><div class="row"><span>Portfolio risk snapshots</span><b>${r.portfolioV3?.count||0}</b></div><div class="row"><span>Stress tests</span><b>${r.portfolioV3?.stressCount||0}</b></div><div class="row"><span>Latest stress state</span><b>${r.portfolioV3?.latestStress?.state||"—"}</b></div><div class="row"><span>External intel snapshots</span><b>${r.externalIntel?.count||0}</b></div><div class="row"><span>Macro event gate</span><b>${r.externalIntel?.calendar||"—"}</b></div><div class="row"><span>Historical CVD</span><b>${r.externalIntel?.histCvd||"—"}</b></div><div class="row"><span>Volatility snapshots</span><b>${r.volatility?.count||0}</b></div><div class="row"><span>Latest volatility regime</span><b>${r.volatility?.latest?.regime||"—"}</b></div><div class="row"><span>Avg RV percentile</span><b>${Number.isFinite(r.volatility?.avgRvPct)?r.volatility.avgRvPct.toFixed(0)+"%":"—"}</b></div><div class="row"><span>Data completeness</span><b>${r.dataQuality.toFixed(0)}%</b></div></div><div class="reportSection"><h4>Observed contexts</h4>${ctxRows||'<div class="small">Need at least 3 resolved outcomes per context.</div>'}</div><div class="reportSection"><h4>Governance</h4><div class="row"><span>Calibration</span><b>${r.governance.calibrationState||"—"}</b></div><div class="row"><span>Drift</span><b>${r.governance.drift||"—"}</b></div><div class="row"><span>Legacy meta</span><b>${r.governance.meta||"—"}</b></div><div class="row"><span>Meta Ensemble v2</span><b>${r.governance.metaEnsembleV2||"—"}</b></div><div class="row"><span>Ensemble disagreement</span><b>${Number.isFinite(r.governance.metaDisagreement)?(r.governance.metaDisagreement*100).toFixed(1)+" pp":"—"}</b></div><div class="row"><span>Shadow model</span><b>${r.governance.shadow||"—"}</b></div><div class="row"><span>Checksum</span><b>${(r.checksum||"—").slice(0,16)}</b></div></div>`
}
async function renderReportHistory(){
  const box=$("reportHistory");if(!box)return;const a=await localReportsAll(50);box.innerHTML=a.length?`<div class="ldRow"><div class="ldCell">Period</div><div class="ldCell">Signals</div><div class="ldCell">Exp.</div><div class="ldCell">PF</div><div class="ldCell">Generated</div><div class="ldCell">Checksum</div></div>`+a.map(r=>{const rid=safeActionToken(r.id,64);return `<div class="ldRow" data-action-click="loadStoredReport(&#x27;${rid}&#x27;)"><div class="ldCell">${escapeHtml(rid)}</div><div class="ldCell">${r.signals?.resolved??0}</div><div class="ldCell">${reportMetric(r.signals?.avg,2,"R")}</div><div class="ldCell">${reportMetric(r.signals?.pf,2)}</div><div class="ldCell">${new Date(r.ts).toLocaleString()}</div><div class="ldCell">${escapeHtml(String(r.checksum||"").slice(0,12))}</div></div>`}).join(""):'<div class="emptyState">No local reports yet.</div>'
}
async function loadStoredReport(id){const r=await localReportGet(id);if(r){currentResearchReport=r;renderResearchReport(r)}}
function downloadTextFile(name,text,type="application/json"){const blob=new Blob([text],{type}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function reportHtml(r){
  const esc=x=>String(x??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));return `<!doctype html><html><head><meta charset="utf-8"><title>Crypto Radar ${esc(r.id)}</title></head><body><h1>Crypto Radar Research Report</h1><p>${esc(r.id)} · generated ${esc(new Date(r.ts).toLocaleString())}</p><h2>${esc(r.headline)}</h2><table><tr><th>Resolved signals</th><td>${r.signals.resolved}</td></tr><tr><th>Expectancy</th><td>${reportMetric(r.signals.avg,2," R")}</td></tr><tr><th>Profit factor</th><td>${reportMetric(r.signals.pf,2)}</td></tr><tr><th>Win rate</th><td>${Number.isFinite(r.signals.win)?(r.signals.win*100).toFixed(0)+"%":"—"}</td></tr><tr><th>Paper realized</th><td>${esc(money(r.paper.realizedUsd))}</td></tr><tr><th>Scanner runs</th><td>${r.scanner.runs}</td></tr><tr><th>Experiments</th><td>${r.experiments.count}</td></tr><tr><th>Decision snapshots</th><td>${r.decisions.count}</td></tr><tr><th>Profit readiness</th><td>${esc(r.profitReadiness?.latest?.state||"—")}</td></tr><tr><th>Paper v3 snapshots</th><td>${r.paperV3?.count||0}</td></tr><tr><th>Volatility snapshots</th><td>${r.volatility?.count||0}</td></tr><tr><th>Latest volatility regime</th><td>${esc(r.volatility?.latest?.regime||"—")}</td></tr><tr><th>Avg RV percentile</th><td>${Number.isFinite(r.volatility?.avgRvPct)?r.volatility.avgRvPct.toFixed(0)+"%":"—"}</td></tr><tr><th>Data quality</th><td>${r.dataQuality.toFixed(0)}%</td></tr></table><h3>Best observed context</h3><p>${esc(r.contexts.best?`${r.contexts.best.name} · ${r.contexts.best.avg.toFixed(2)}R`:"Insufficient sample")}</p><h3>Avoid context</h3><p>${esc(r.contexts.worst?`${r.contexts.worst.name} · ${r.contexts.worst.avg.toFixed(2)}R`:"Insufficient sample")}</p><p>Checksum: ${esc(r.checksum)}</p><p><small>Research summary only. Historical observations do not guarantee future results.</small></p></body></html>`
}
async function exportCurrentResearchReport(fmt="json"){
  if(!currentResearchReport)currentResearchReport=await generateResearchReport(false);const r=currentResearchReport,name=`crypto-radar-${r.id.replace(":","-").toLowerCase()}`;
  if(fmt==="html")downloadTextFile(name+".html",reportHtml(r),"text/html");else downloadTextFile(name+".json",JSON.stringify(r,null,2),"application/json")
}
async function exportResearchBundle(){
  const report=currentResearchReport||await generateResearchReport(false),w=periodWindow(report.period),signals=(await localArchiveMerged("signals",journal())).filter(x=>(+x.ts||0)>=w.start),paper=(await localArchiveMerged("paper",paperTrades())).filter(x=>(+x.created||+x.ts||0)>=w.start),scans=(await localDbRecords("scanner_runs",w.start,5000)).map(x=>x.data),decisions=(await localDbRecords("decisions",w.start,5000)).map(x=>x.data),verdictCenter=(await localDbRecords("verdict_center",w.start,5000)).map(x=>x.data),profitReadiness=(await localDbRecords("profit_readiness",w.start,5000)).map(x=>x.data),historicalReplay=(await localDbRecords("historical_replay",w.start,10000)).map(x=>x.data),historicalScans=(await localDbRecords("historical_scans",w.start,5000)).map(x=>x.data),paperV3=(await localDbRecords("paper_v3",w.start,5000)).map(x=>x.data),experiments=(await localArchiveMerged("experiments",experimentRegistry())).filter(x=>(+x.created||0)>=w.start),portfolioRisk=(await localDbRecords("portfolio_risk",w.start,5000)).map(x=>x.data),stressTests=(await localDbRecords("stress_tests",w.start,5000)).map(x=>x.data),externalIntel=(await localDbRecords("external_intel",w.start,5000)).map(x=>x.data),volatilityIntel=(await localDbRecords("volatility_intel",w.start,5000)).map(x=>x.data),providerHealthV62=(await localDbRecords("provider_health_v62",w.start,5000)).map(x=>x.data),liveReadinessV63=(await localDbRecords("live_readiness_v63",w.start,5000)).map(x=>x.data),marketBreadthV64=(await localDbRecords("market_breadth_v64",w.start,5000)).map(x=>x.data),decisionIntelV65=(await localDbRecords("decision_intel_v65",w.start,5000)).map(x=>x.data),edgeValidationV66=(await localDbRecords("edge_validation_v66",w.start,5000)).map(x=>x.data),operationsV67=(await localDbRecords("ops_heartbeat_v67",w.start,5000)).map(x=>x.data),opsIncidentsV67=(await localDbRecords("ops_incidents_v67",w.start,5000)).map(x=>x.data),liveExecutionV68=(await localDbRecords("live_execution_v68",w.start,5000)).map(x=>x.data),livePerformanceV69=(await localDbRecords("live_performance_v69",w.start,5000)).map(x=>x.data),pionexJournalV71=(await localDbRecords("pionex_journal_v71",w.start,5000)).map(x=>x.data),shadowLiveV60=(await localDbRecords("shadow_live_v60",w.start,5000)).map(x=>x.data),edgeDriftV61=(await localDbRecords("edge_drift_v61",w.start,5000)).map(x=>x.data),championChallengerV61=(await localDbRecords("champion_challenger_v61",w.start,5000)).map(x=>x.data),payload={schemaVersion:54,created:Date.now(),report,signals,paper,scannerRuns:scans,decisions,verdictCenter,profitReadiness,historicalReplay,historicalScans,paperV3,experiments,portfolioRisk,stressTests,externalIntel,volatilityIntel,providerHealthV62,liveReadinessV63,marketBreadthV64,decisionIntelV65,edgeValidationV66,operationsV67,opsIncidentsV67,liveExecutionV68,livePerformanceV69,pionexJournalV71,shadowLiveV60,ndxMembership:{snapshotDate:NDX_SNAPSHOT_DATE,coverageStart:NDX_HISTORY_COVERAGE_START,events:NDX_MEMBERSHIP_EVENTS},edgeDriftV61,championChallengerV61,modelVersions:modelVersions(),localDataSettings:localDataSettings(),portfolioV3Settings:portfolioV3Settings(),metaEnsembleV2:serializeMetaEnsembleV2()},raw=JSON.stringify(payload),checksum=await sha256Text(raw),bundle={schemaVersion:54,checksum,payload};downloadTextFile(`crypto-radar-v71-research-bundle-${report.key}.json`,JSON.stringify(bundle,null,2),"application/json");$("reportChecksum").textContent=checksum.slice(0,14)
}
async function autoGenerateResearchReports(){
  if(!localDbSupported())return;let daily=null;
  for(const period of ["DAILY","WEEKLY","MONTHLY"]){const w=periodWindow(period),id=`${w.period}:${w.key}`,existing=await localReportGet(id);let r=existing;if(!existing||Date.now()-existing.ts>6*3600000){r=await buildResearchReport(period);await localReportPut(r)}if(period==="DAILY")daily=r}
  if(daily){currentResearchReport=daily;renderResearchReport(daily)}
}
async function initLocalDataLayer(){
  const mig=await migrateLocalDataV54();if($("localMigration"))$("localMigration").textContent=mig.ts?new Date(mig.ts).toLocaleString():mig.state;await hydrateResearchArchives();await hydrateLiquidationArchive();await autoGenerateResearchReports();await refreshLocalDataPanel()
}
async function archiveDecisionSnapshot(){
  const st=window.__radarState,m=window.__masterVerdict;if(!st||!m)return false;const key=`${st.symbol}|${st.tf}|${Math.floor(Date.now()/300000)}`;if(key===lastDecisionArchiveKey&&Date.now()-lastDecisionArchiveTs<300000)return false;lastDecisionArchiveKey=key;lastDecisionArchiveTs=Date.now();
  const now=Date.now(),vc=window.__verdictCenter||buildVerdictCenterSnapshot(),vcSummary={agreement:vc.agreement,coverage:vc.coverage,weightedBias:vc.weightedBias,consensus:vc.consensus,conviction:vc.conviction,counts:vc.counts,families:vc.families};
  const payload={ts:now,market:assetClass(),symbol:st.symbol,tf:st.tf,source:st.source||analysisSource(),regime:regimeV2State?.state||st.q.regime,verdict:m.verdict,score:m.score,evidence:m.evidence,budget:m.budget,quality:m.quality,meta:currentMetaDecision(),calibrated:calibrationV2State?.p??null,flow:trueFlowState&&!trueFlowState.error?{delta:trueFlowState.delta,state:trueFlowState.state}:null,external:{calendar:externalIntelState.calendar?.summary?.risk||null,onchain:externalIntelState.onchain?.contextScore??null,predLiq:externalIntelState.predLiq?.summary?.state||null,options:externalIntelState.options?.context?.state||null,histCvd:externalIntelState.histCvd?.summary?.state||null},volatility:window.__volatilityIntel?{regime:window.__volatilityIntel.regime,alert:window.__volatilityIntel.alert,rv20:window.__volatilityIntel.rv20,rvPct:window.__volatilityIntel.rvPct,riskMultiplier:window.__volatilityIntel.riskMultiplier,ivRv:window.__volatilityIntel.implied?.ratio??null}:null,verdictCenter:vcSummary};
  const a=await localDbPutRecord("decisions",`${now}|${st.symbol}|${st.tf}`,payload,now),b=await localDbPutRecord("verdict_center",`${now}|${st.symbol}|${st.tf}`,{ts:now,market:assetClass(),symbol:st.symbol,tf:st.tf,source:st.source||analysisSource(),...vcSummary},now);return a||b
}
const DEFAULT_SETTINGS={signalMin:64,nearPct:.5,feeBps:10,slippageBps:3,executionPolicy:"staged",entryExpiryBars:12,spotProvider:"BINANCE",enableExperimentalVolRisk:false,privacySessionOnly:false,alerts:{sr:true,ls:true,funding:true,oi:true,signal:true}};
function appSettings(){try{return {...DEFAULT_SETTINGS,...JSON.parse(localStorage.getItem("radarSettings")||"{}"),alerts:{...DEFAULT_SETTINGS.alerts,...(JSON.parse(localStorage.getItem("radarSettings")||"{}").alerts||{})}}}catch{return JSON.parse(JSON.stringify(DEFAULT_SETTINGS))}}
function putSettings(x){localStorage.setItem("radarSettings",JSON.stringify(x))}
async function applyPrivacyMode(){
 const enable=!!$("privacySessionOnly")?.checked,x=appSettings();if(enable&&!x.privacySessionOnly){if(!confirm("Enable session-only privacy mode and erase persisted research journal, Paper working set and IndexedDB research archive? Current in-memory session data remains available until the tab closes.")){renderSettings();return}privacySessionState.experiments=experimentRegistry().slice();privacySessionState.models=modelVersions().slice();privacySessionState.activeModelId=activeModelVersionId;privacySessionState.metaEnsemble=serializeMetaEnsembleV2();try{privacySessionState.trueFlow=JSON.parse(localStorage.getItem(TRUE_FLOW_HISTORY_KEY)||"{}")}catch{privacySessionState.trueFlow={}}x.privacySessionOnly=true;putSettings(x);for(const k of ["signalJournal","paperTrades",PAPER_EQUITY_KEY,EXP_REGISTRY_KEY,MODEL_VERSION_KEY,ACTIVE_MODEL_VERSION_KEY,META_ENSEMBLE_V2_KEY,LIQ_HISTORY_KEY,TRUE_FLOW_HISTORY_KEY])localStorage.removeItem(k);await deleteLocalResearchDb();toast("Session-only privacy mode enabled · persistent research archive erased","warn")}else if(!enable&&x.privacySessionOnly){x.privacySessionOnly=false;putSettings(x);toast("Persistent local research storage re-enabled for future writes","good")}renderSettings();await refreshLocalDataPanel().catch(()=>{})
}
function toggleSetting(k){
 let x=appSettings();x.alerts[k]=!x.alerts[k];putSettings(x);renderSettings()
}
function saveSettings(){
 let x=appSettings();x.signalMin=+$("setSignalMin").value;x.nearPct=+$("setNearPct").value;
 if($("setFeeBps"))x.feeBps=+$("setFeeBps").value;if($("setSlipBps"))x.slippageBps=+$("setSlipBps").value;if($("setExecPolicy"))x.executionPolicy=$("setExecPolicy").value;if($("setEntryExpiry"))x.entryExpiryBars=+$("setEntryExpiry").value;if($("setSpotProvider"))x.spotProvider=$("setSpotProvider").value;if($("analysisSource"))$("analysisSource").value=x.spotProvider||"BINANCE";localStorage.setItem("analysisProvider",x.spotProvider||"BINANCE");
 putSettings(x);stopProviderLive();updateSourceLineage(x.spotProvider||analysisSource());renderSettings();renderValidation();renderForwardLab();toast("Settings saved","good")
}
function applyPreset(name){
 let x=appSettings();
 if(name==="conservative"){x.signalMin=72;x.nearPct=.35;$("mode").value="swing"}
 else if(name==="aggressive"){x.signalMin=60;x.nearPct=.75;$("mode").value="scalp"}
 else{x.signalMin=64;x.nearPct=.5;$("mode").value="auto"}
 putSettings(x);localStorage.setItem("mode",$("mode").value);renderSettings();toast("Preset "+name+" applied","good")
}
function renderSettings(){
 const x=appSettings();
 if($("setSignalMin"))$("setSignalMin").value=String(x.signalMin);
 if($("setNearPct"))$("setNearPct").value=String(x.nearPct);
 if($("setFeeBps"))$("setFeeBps").value=String(x.feeBps??10);
 if($("setSlipBps"))$("setSlipBps").value=String(x.slippageBps??3);
 if($("setExecPolicy"))$("setExecPolicy").value=x.executionPolicy||"staged";
 if($("setEntryExpiry"))$("setEntryExpiry").value=String(x.entryExpiryBars??12);
 if($("setSpotProvider"))$("setSpotProvider").value=x.spotProvider||"BINANCE";
 if($("privacySessionOnly"))$("privacySessionOnly").checked=!!x.privacySessionOnly;
 for(const k of ["sr","ls","funding","oi","signal"]){const el=$("toggle"+k.charAt(0).toUpperCase()+k.slice(1));if(el)el.classList.toggle("on",!!x.alerts[k])}
 if($("notifStatus"))$("notifStatus").textContent=typeof Notification==="undefined"?"Unsupported":Notification.permission;renderPushStatus().catch(()=>{});
 const r=journal().filter(x=>Number.isFinite(x.rResult));
 if($("calResolved"))$("calResolved").textContent=r.length;
 let byMode={},byReg={};
 r.forEach(x=>{(byMode[x.mode]??=[]).push(x.rResult);(byReg[x.regime]??=[]).push(x.rResult)});
 const best=obj=>Object.entries(obj).sort((a,b)=>(b[1].reduce((x,y)=>x+y,0)/b[1].length)-(a[1].reduce((x,y)=>x+y,0)/a[1].length))[0]?.[0]||"—";
 if($("calBestMode"))$("calBestMode").textContent=best(byMode);
 if($("calBestRegime"))$("calBestRegime").textContent=best(byReg);
 if($("calThreshold"))$("calThreshold").textContent=r.length<15?"Need ≥15 signals":String(x.signalMin);
}
function recalibrate(){
 let r=resolvedR(analysisSource());if(r.length<30){toast("Need at least 30 cost-aware resolved signals for this source","warn");renderSettings();return}
 let recent=r.slice(0,40),wr=recent.filter(x=>x.r>0).length/recent.length,avg=recent.reduce((a,x)=>a+x.r,0)/recent.length,x=appSettings();
 if(wr<.45||avg<0)x.signalMin=Math.min(76,x.signalMin+2);else if(wr>.60&&avg>.15)x.signalMin=Math.max(60,x.signalMin-1);
 putSettings(x);renderSettings();renderForwardLab();toast("Threshold recalibrated conservatively","good")
}
async function requestNotifications(){
 if(typeof Notification==="undefined"){toast("Browser notifications unsupported","warn");return}
 const p=await Notification.requestPermission();renderSettings();toast("Notification permission: "+p,p==="granted"?"good":"warn")
}
async function showRadarNotification(title,msg,url="/?panel=alerts"){
 if(typeof Notification==="undefined"||Notification.permission!=="granted")return;
 try{
   if("serviceWorker" in navigator){const reg=await navigator.serviceWorker.ready;await reg.showNotification("Crypto Radar · "+title,{body:msg,icon:"/icon-192.png",badge:"/icon-192.png",data:{url},tag:"radar-"+title})}
   else new Notification("Crypto Radar · "+title,{body:msg})
 }catch{}
}
function appAlerts(){try{return JSON.parse(localStorage.getItem("radarAlerts")||"[]")}catch{return []}}
function putAlerts(a){localStorage.setItem("radarAlerts",JSON.stringify(a.slice(0,100)));updateAlertBadges()}
function addAlert(kind,title,msg,severity="warn"){
 let a=appAlerts(),key=kind+"|"+title+"|"+msg,last=a[0];
 if(last&&last.key===key&&Date.now()-last.ts<10*60*1000)return;
 a.unshift({key,kind,title,msg,severity,ts:Date.now(),read:false});putAlerts(a);renderAlerts();
 toast(title,severity==="high"?"bad":severity==="good"?"good":"warn");
 showRadarNotification(title,msg).catch(()=>{})
}
function renderAlerts(){
 const a=appAlerts(),box=$("alertList");if(box)box.innerHTML=a.length?a.map(x=>`<div class="alertItem"><div class="alertIcon">${x.severity==="high"?"!":x.severity==="good"?"↗":"•"}</div><div><strong>${escapeHtml(x.title)}</strong><p>${escapeHtml(x.msg)}</p></div><span class="alertTime">${new Date(x.ts).toLocaleTimeString()}</span></div>`).join(""):`<div class="emptyState">No alerts yet.</div>`;
 updateAlertBadges()
}
function updateAlertBadges(){
 const n=appAlerts().filter(x=>!x.read).length;for(const id of ["sideAlertCount","topAlertCount"]){const e=$(id);if(e){e.textContent=n;e.style.display=n?"inline-grid":"none"}}
}
function clearAlerts(){localStorage.removeItem("radarAlerts");renderAlerts();toast("Alerts cleared","warn")}
function markAlertsRead(){let a=appAlerts();a.forEach(x=>x.read=true);putAlerts(a)}
function checkAlerts(q,sm,deriv){
 const st=appSettings(),p=q.price,near=st.nearPct/100;
 if(st.alerts.sr){
   for(const [n,v] of [["S1",q.levels.s1],["R1",q.levels.r1],["Pivot",q.levels.pivot]])if(Math.abs(p/v-1)<=near)addAlert("sr","Price near "+n,`${coin(norm($("symbol").value))} is within ${st.nearPct}% of ${n} (${num(v)})`,"warn")
 }
 if(st.alerts.signal&&sm&&Math.max(sm.long,sm.short)>=st.signalMin&&sm.direction!=="WAIT")addAlert("signal","Strong "+sm.direction+ " setup",`${coin(norm($("symbol").value))} confidence ${Math.max(sm.long,sm.short).toFixed(0)}/100`,"good");
 if(deriv){
   if(st.alerts.ls&&deriv.ls!=null&&(deriv.ls>1.5||deriv.ls<.67))addAlert("ls","Extreme Long/Short",`Ratio ${deriv.ls.toFixed(2)} · ${deriv.ls>1.5?"longs crowded":"shorts crowded"}`,"high");
   if(st.alerts.funding&&deriv.funding!=null&&Math.abs(deriv.funding)>.0005)addAlert("funding","Funding extreme",`${(deriv.funding*100).toFixed(4)}% funding`,"high");
   if(st.alerts.oi&&deriv.oiTrend&&deriv.oiTrend!=="N/A"&&Math.abs(parseFloat(deriv.oiTrend))>=3)addAlert("oi","OI expansion",`${deriv.oiTrend} over recent samples`,"warn")
 }
}
let marketCache={ts:0,rows:[],source:null};
async function loadMarketOverview(force=false){
 const box=$("marketOverview");if(!box)return;
 const src=analysisSource();if(!force&&marketCache.rows.length&&marketCache.source===src&&Date.now()-marketCache.ts<60000){renderMarketOverview();return}
 box.innerHTML='<div class="emptyState">Loading market overview…</div>';
 const stocks=assetClass()==="STOCKS",coins=stocks?["QQQ","AAPL","MSFT","NVDA","AMZN","META","TSLA","AMD","AVGO","GOOGL","PLTR","SPCX"]:["BTC","ETH","SOL","BNB","XRP","DOGE","ADA","LINK","AVAX","SUI","LTC","TRX"],rows=[];
 for(let i=0;i<coins.length;i+=4){
   const b=coins.slice(i,i+4);
   const r=await Promise.all(b.map(async c=>{try{
     const sym=stocks?c:c+"USDT",[tk,k]=await Promise.all([analysisTicker(sym,src),analysisKlines(sym,stocks?"1d":"4h",260,src)]),q=calc(k,$("mode").value);
     return {c,price:+tk.lastPrice||q.price,ch:+tk.priceChangePercent,score:q.score,regime:q.regime,ver:q.ver,adx:q.adx}
   }catch{return null}}));
   rows.push(...r.filter(Boolean))
 }
 marketCache={ts:Date.now(),rows,source:src};renderMarketOverview()
}
function renderMarketOverview(){
 const rows=marketCache.rows,box=$("marketOverview");if(!box)return;
 const suffix=assetClass()==="STOCKS"?" · USD":"/USDT";
 box.innerHTML=rows.length?rows.map(x=>`<div class="marketTile" data-action-click="pick(&#x27;${x.c}&#x27;)"><div class="coinName">${x.c}${suffix}</div><div class="marketPrice">${num(x.price)}</div><div class="${x.ch>=0?"good":"bad"}">${x.ch>=0?"+":""}${x.ch.toFixed(2)}%</div><div class="marketMeta"><span>${x.regime}</span><span>Score ${x.score.toFixed(0)}</span><span>ADX ${x.adx.toFixed(0)}</span></div></div>`).join(""):'<div class="emptyState">Market data unavailable.</div>';
 let bull=rows.filter(x=>x.ver==="BULLISH").length,bear=rows.filter(x=>x.ver==="BEARISH").length,neu=rows.length-bull-bear,avg=rows.length?rows.reduce((a,x)=>a+x.ch,0)/rows.length:0;
 $("breadthBull").textContent=bull;$("breadthBear").textContent=bear;$("breadthNeutral").textContent=neu;$("breadth24").textContent=(avg>=0?"+":"")+avg.toFixed(2)+"%"
}
function toast(msg,type=""){
 const host=$("toastHost");if(!host)return;const d=document.createElement("div");d.className="toast "+type;d.textContent=msg;host.appendChild(d);setTimeout(()=>d.remove(),3200)
}
function navTo(id,load=false){
 show(id);
 document.querySelectorAll("[data-nav]").forEach(x=>x.classList.toggle("active",x.dataset.nav===id));
 if(load){
   if(id==="mtf")multiTF();
   else if(id==="tabloubot")porneTabloBot();
   else if(id==="gridset")porneGrid();
   else if(id==="jurnaltrade")jtPorneste();
   else if(id==="account"){loadPionexAccount();loadPionexOpenOrders()}
   else if(id==="stocks"){loadStockContext();checkStocksHealth()}
   else if(id==="scan")scan();
   else if(id==="replaylab")renderReplayLab();
   else if(id==="market")loadMarketOverview();
   else if(id==="profile")renderVolumeProfile();
   else if(id==="quantflow"&&window.__radarState)renderQuantFlow(window.__radarState.q,window.__derivativesState||{});
   else if(id==="micro")loadPionexMicrostructure();
   else if(id==="correlation")loadCorrelation();
   else if(id==="depth")loadDepth();
   else if(id==="signals")renderSignals();
   else if(id==="backtest")backtestCurrent();
   else if(id==="deriv")derivatives();
   else if(id==="health")runHealthCheck();
   else if(id==="portfolio"){renderPortfolioV3Inputs();loadPortfolioRisk(true)}
   else if(id==="cloud")loadCloudMonitor(true);
   else if(id==="profilelab")renderAdvancedProfile();
   else if(id==="volatilitylab")renderVolatilityIntelligence(false);
   else if(id==="structurelab")renderStructureSession();
   else if(id==="intel"){loadContextIntel(true);loadIntelNews(false);loadExternalIntelligence(false).catch(()=>{})}
 } else {
   if(id==="alerts")renderAlerts();
   if(id==="desk")renderDailyDesk();
   if(id==="opportunity")renderOpportunity();
   if(id==="calibration")renderCalibrationLab();
   if(id==="settings"){renderSettings();renderPushStatus()}
   if(id==="stocks"){loadStockContext().catch(()=>{});checkStocksHealth().catch(()=>{})}
   if(id==="riskmgr")calculateRisk();
   if(id==="decision"&&window.__radarState)buildDecision(window.__radarState.q,window.__radarState.hs||historicalSet(window.__radarState.j),mtfComposite(window.__radarState.m||[]),window.__signalState?.sm||{direction:"WAIT",long:50,short:50,edge:0});
   if(id==="paper"){renderPaper();refreshPaper()}
   if(id==="analytics")renderAnalytics();
   if(id==="robustness")renderStrategyLifecycle();
   if(id==="portfolio"){renderPortfolioV3Inputs();loadPortfolioRisk(true)};
   if(id==="cloud")loadCloudMonitor(true);
   if(id==="profilelab")renderAdvancedProfile();
   if(id==="volatilitylab")renderVolatilityIntelligence(false);
   if(id==="structurelab")renderStructureSession();
   if(id==="intel"){loadContextIntel(true).catch(()=>{});loadIntelNews(false).catch(()=>{});loadExternalIntelligence(false).catch(()=>{})}
   if(id==="researchml"){renderMlLens();renderCalibrationGovernance();renderDecisionWaterfall();renderExperimentRegistry();runLeakageAudit();}
   if(id==="decisioncore")renderDecisionCore();
   if(id==="localdata")refreshLocalDataPanel();
   if(id==="validation")renderValidation();
   if(id==="forward")renderForwardLab();
   if(id==="edgepro")renderEdgePro();
   if(id==="profitready")renderProfitReadiness(false);
   if(id==="replaylab")renderReplayLab();
   if(id==="montecarlo")runMonteCarlo();
   if(id==="scenario")renderScenario();
   if(id==="health")runHealthCheck();
 }
 window.scrollTo({top:0,behavior:"smooth"})
}
function setBusy(b,msg="Actualizare…"){
 const btn=$("analyzeBtn");if(btn){btn.disabled=b;btn.textContent=b?"Se analizează…":"Analizează piața"}
 if(msg&&$("status"))$("status").textContent=msg;
}
function syncTop(sym,tf,mode){
 const stocks=assetClass()==="STOCKS",c=coin(sym),suffix=stocks?" · USD":"/USDT";$("topCoin").textContent=c+suffix;$("topTf").textContent=tf;$("topMode").textContent=mode.toUpperCase();$("heroCoin").textContent=stocks?c+" · US STOCK":c+" / USDT";
}
const PIONEX_BASE="https://api.pionex.com";
const PIONEX_STABLE_BASES=new Set(["USDT","USDC","FDUSD","TUSD","USDP","DAI","USDE","PYUSD"]);
let pionexUniverse=[];
let pionexUniverseUpdated=0;
const PIONEX_UNIVERSE_CACHE_KEY="pionexUniverseV45";
const PIONEX_FALLBACK_SNAPSHOT_DATE="2026-09-20";
const PIONEX_VERIFIED_USDT_CORE=[
"BTC","ETH","DOGE","SOL","BICO","ADA","DEXE","XRP","BNB","ZEC","DODO","TRX","ACE","CTSI","RIF","BOME","ALICE","BCH","BB","SUI","AXS","DASH","ALGO","PAXG","LDO","ALT","APT","BDX","BONK","EDU","BEL","OKB","CVX","BNT","C98","DYM","ARB","IOTX","TAO","PHA","CHZ"
];
function staticPionexUniverse(){
  return PIONEX_VERIFIED_USDT_CORE.map((base,i)=>({
    symbol:`${base}_USDT`,base,turnover:0,close:0,change:0,
    universeSource:"PIONEX_SNAPSHOT",rank:i+1
  }))
}
function setScanUniverseStatus(kind,note=""){
  if(!$("scanUniverseSource"))return;
  const map={
    PIONEX_LIVE:["PIONEX LIVE","scanLive"],
    PIONEX_SAVED:["PIONEX SAVED","scanSaved"],
    PIONEX_SNAPSHOT:[`PIONEX SNAPSHOT ${PIONEX_FALLBACK_SNAPSHOT_DATE}`,"scanSnapshot"]
  },x=map[kind]||[kind||"—",""];
  $("scanUniverseSource").textContent=x[0];$("scanUniverseSource").className=x[1];
  if($("scanUniverseNote"))$("scanUniverseNote").textContent=note||"Pionex coin universe · Binance technical data."
}
function savePionexUniverseCache(rows){
  try{localStorage.setItem(PIONEX_UNIVERSE_CACHE_KEY,JSON.stringify({ts:Date.now(),rows:(rows||[]).slice(0,100)}))}catch{}
}
function loadPionexUniverseCache(){
  for(const key of [PIONEX_UNIVERSE_CACHE_KEY,"pionexUniverseV44"]){
    try{
      const x=JSON.parse(localStorage.getItem(key)||"null");
      if(x&&Array.isArray(x.rows)&&x.rows.length){
        if(key!==PIONEX_UNIVERSE_CACHE_KEY)try{localStorage.setItem(PIONEX_UNIVERSE_CACHE_KEY,JSON.stringify(x))}catch{}
        return {ts:+x.ts||0,rows:x.rows.slice(0,100)}
      }
    }catch{}
  }
  return null
}

const $=id=>document.getElementById(id);function norm(s){return marketSymbol(s)}function coin(s){return String(s||"").replace(/USDT$/,"")}
function num(x){return Number(x).toLocaleString(undefined,{maximumFractionDigits:8})}function compact(x){return Intl.NumberFormat(undefined,{notation:"compact",maximumFractionDigits:2}).format(x)}
function cls(v){return v==="BULLISH"?"good":v==="BEARISH"?"bad":"neutral"}function show(id){document.body.classList.toggle("peTablou",id==="tabloubot");var tbActiv=document.querySelector(".panel.on");var tbIeseDeTablou=tbActiv&&tbActiv.id==="tabloubot"&&id!=="tabloubot";document.querySelectorAll(".panel").forEach(x=>x.classList.remove("on"));$(id).classList.add("on");if(tbIeseDeTablou)opresteTabloBot();document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));const map={dash:0,engine:1,mtf:2,scan:3,backtest:4,signals:5,deriv:6,watch:7};const tabs=document.querySelectorAll(".tab");if(tabs[map[id]])tabs[map[id]].classList.add("active");document.querySelectorAll("[data-nav]").forEach(x=>x.classList.toggle("active",x.dataset.nav===id))}
function ema(a,n){let k=2/(n+1),v=a[0],o=[];for(const x of a){v=x*k+v*(1-k);o.push(v)}return o}
function RSI(a,n=14){let g=0,l=0,o=Array(a.length).fill(50);for(let i=1;i<a.length;i++){let d=a[i]-a[i-1],u=Math.max(d,0),dn=Math.max(-d,0);if(i<=n){g+=u;l+=dn;if(i===n){g/=n;l/=n}}else{g=(g*(n-1)+u)/n;l=(l*(n-1)+dn)/n;if(i>=n)o[i]=l?100-100/(1+g/l):100}}return o}
const MARKET_BASES=[
  "https://data-api.binance.vision/api/v3",
  "https://api.binance.com/api/v3",
  "https://api-gcp.binance.com/api/v3",
  "https://api1.binance.com/api/v3",
  "https://api2.binance.com/api/v3",
  "https://api3.binance.com/api/v3",
  "https://api4.binance.com/api/v3"
];
const APP_API_TOKEN_SESSION_KEY="cryptoRadarApiTokenV54";
// Parola se tine acum pe DISPOZITIV (localStorage), nu pe sesiune: inainte se
// stergea la inchiderea tabului, deci pe telefon o cerea de fiecare data.
// sessionStorage ramane citit ca sa nu cada sesiunea deschisa in momentul livrarii.
function apiSessionToken(){try{return localStorage.getItem(APP_API_TOKEN_SESSION_KEY)||sessionStorage.getItem(APP_API_TOKEN_SESSION_KEY)||""}catch{return ""}}
function saveApiSessionToken(){apiTokenRespins=null;const v=$("apiSessionToken")?.value?.trim()||"";try{if(v){localStorage.setItem(APP_API_TOKEN_SESSION_KEY,v);sessionStorage.removeItem(APP_API_TOKEN_SESSION_KEY)}else{localStorage.removeItem(APP_API_TOKEN_SESSION_KEY);sessionStorage.removeItem(APP_API_TOKEN_SESSION_KEY)}}catch{}renderApiAuthStatus();toast(v?"Parola e ținută minte pe acest dispozitiv":"Parola a fost ștearsă",v?"good":"warn")}
function clearApiSessionToken(){apiTokenRespins=null;try{localStorage.removeItem(APP_API_TOKEN_SESSION_KEY);sessionStorage.removeItem(APP_API_TOKEN_SESSION_KEY)}catch{}if($("apiSessionToken"))$("apiSessionToken").value="";renderApiAuthStatus();toast("Parola a fost uitată de pe acest dispozitiv","good")}
// Un camp GOL peste o parola salvata l-ar face sa creada ca trebuie s-o puna
// din nou - adica exact ce ne-am propus sa nu mai faca. Se precompleteaza.
function renderApiAuthStatus(){const t=apiSessionToken();
  if($("apiAuthStatus"))$("apiAuthStatus").textContent=t?"ȚINUTĂ MINTE PE ACEST DISPOZITIV":"NEPUSĂ";
  const c=$("apiSessionToken");if(c&&!c.value&&t)c.value=t;
  // Prima deschidere fara parola: aplicatia spune UNDE se pune, nu doar "401".
  if($("parolaLipsa"))$("parolaLipsa").hidden=!!t;
  // v77.3: pe versiunea publicata (Cloudflare) botii nu se pot vedea niciodata -
  // se spune sus, pe orice ecran, cu drumul spre Radarul de acasa.
  if($("pePublicat"))$("pePublicat").hidden=!/\.pages\.dev$|\.workers\.dev$/.test(String(location.hostname||"").toLowerCase())}
// v74.6: serverul blocheaza IP-ul un minut (429 AUTH_RATE_LIMITED) dupa 10
// parole gresite pe minut - iar Tabloul intreaba la 8 s. Un token pe care
// serverul l-a respins (AUTH_INVALID) nu mai pleaca AUTOMAT pana cand omul
// nu pune alta parola (sau o salveaza din nou) in Setari - dar cel mult un
// minut (cat tine blocarea serverului): apoi mai incearca o data, ca o
// retea cazuta sau un server repornit sa nu para "parola gresita" la nesfarsit.
let apiTokenRespins=null,apiTokenRespinsLa=0;const API_TOKEN_RESPINS_MS=60000;
function apiFetch(url,opt={}){const u=String(url),same=u.startsWith("/api/")||(()=>{try{return new URL(u,location.href).origin===location.origin&&new URL(u,location.href).pathname.startsWith("/api/")}catch{return false}})(),headers=new Headers(opt.headers||{});let token="";if(same){token=apiSessionToken();if(token&&token===apiTokenRespins&&Date.now()-apiTokenRespinsLa<API_TOKEN_RESPINS_MS)return Promise.resolve(new Response(JSON.stringify({error:"AUTH_INVALID",detail:"parola a fost respinsă de server - nu o mai trimit până nu o schimbi în Setări"}),{status:401,headers:{"content-type":"application/json"}}));if(token)headers.set("authorization",`Bearer ${token}`);headers.set("x-client-version",APP_VERSION)}return fetch(url,{...opt,headers,credentials:same?"same-origin":opt.credentials}).then(r=>{if(same&&token&&r.status===401)return r.clone().json().then(d=>{if(d&&d.error==="AUTH_INVALID"){apiTokenRespins=token;apiTokenRespinsLa=Date.now()}return r},()=>r);return r})}
async function getJSON(url){
  const r=await apiFetch(url,{method:"GET",mode:"cors",cache:"no-store",headers:{"accept":"application/json"}});
  const raw=await r.text();
  let data;
  try{data=JSON.parse(raw)}catch{throw Error("Răspuns invalid · HTTP "+r.status)}
  if(!r.ok){
    const parts=[data&&data.error,data&&data.detail,data&&data.msg].filter(Boolean);
    const err=Error(parts.length?parts.join(" · "):("HTTP "+r.status));
    err.status=r.status;
    if(data&&data.retryAfter!=null)err.retryAfter=Number(data.retryAfter);
    throw err
  }
  return data;
}
async function market(path){
  const errors=[];
  for(const base of MARKET_BASES){
    try{return await getJSON(base+path)}
    catch(e){errors.push(base.replace(/^https?:\/\//,"")+": "+e.message)}
  }
  throw Error("Date spot indisponibile · "+errors.join(" | "));
}
async function klines(s,t,l=300){
  const key=cacheKey("binance-klines",`${s}|${t}|${l}`),ttl=t==="15m"?8000:t==="1h"?12000:t==="4h"?20000:30000;
  return memoRequest(key,ttl,()=>market(`/klines?symbol=${encodeURIComponent(s)}&interval=${encodeURIComponent(t)}&limit=${l}`));
}
async function ticker(s){
  const key=cacheKey("binance-ticker",s);
  return memoRequest(key,5000,async()=>{
    try{return await market(`/ticker/24hr?symbol=${encodeURIComponent(s)}`)}
    catch{
      const k=await market(`/klines?symbol=${encodeURIComponent(s)}&interval=1h&limit=24`);
      const last=+k[k.length-1][4],first=+k[0][1];
      let quoteVolume=0; for(const x of k)quoteVolume+=+(x[7]||0);
      return {priceChangePercent:first?String((last/first-1)*100):"0",quoteVolume:String(quoteVolume)};
    }
  })
}


let pionexLastError="",pionexCooldownUntil=0,pionexQueue=Promise.resolve(),pionexNextAllowed=0,pionexRateStrikes=0,pionexScannerActive=false;
const PIONEX_MIN_INTERVAL_MS=700;
const PIONEX_WEIGHT_UNIT_MS=220;
function pionexWeight(proxyType){return proxyType==="pionex_symbols"?5:1}
function pionexCooldownRemaining(){return Math.max(0,pionexCooldownUntil-Date.now())}
function pionexBackoffMs(serverMs=0){
  const strikeBackoff=pionexRateStrikes<=1?75000:pionexRateStrikes===2?120000:300000;
  return Math.max(serverMs||0,strikeBackoff)
}
function setPionexCooldown(ms=65000,reason="HTTP 429"){
  pionexRateStrikes=Math.min(6,pionexRateStrikes+1);
  const finalMs=pionexBackoffMs(ms);
  pionexCooldownUntil=Math.max(pionexCooldownUntil,Date.now()+finalMs);
  pionexLastError=reason;
  if($("pionexRateState"))$("pionexRateState").textContent=`Cooldown ${Math.ceil(finalMs/1000)}s · strike ${pionexRateStrikes}`;
  if($("healthPionexCooldown"))$("healthPionexCooldown").textContent=`${Math.ceil(finalMs/1000)}s`;
  if($("healthPionexStrikes"))$("healthPionexStrikes").textContent=String(pionexRateStrikes);
}
function markPionexSuccess(){
  if(!pionexCooldownRemaining()&&pionexRateStrikes>0)pionexRateStrikes=Math.max(0,pionexRateStrikes-1);
  if($("healthPionexStrikes"))$("healthPionexStrikes").textContent=String(pionexRateStrikes)
}
function parseRetryMs(message,retryAfter=null){
  if(Number.isFinite(+retryAfter)&&+retryAfter>0)return Math.max(65000,+retryAfter*1000);
  const m=String(message||"").match(/retry(?:-after)?[^0-9]*(\d+)/i);
  return m?Math.max(65000,Number(m[1])*1000):65000
}
async function awaitPionexReady(label="Pionex"){
  while(pionexCooldownRemaining()>0){
    const sec=Math.ceil(pionexCooldownRemaining()/1000);
    if($("pionexRateState"))$("pionexRateState").textContent=`${label} paused · ${sec}s`;
    if($("healthPionexCooldown"))$("healthPionexCooldown").textContent=`${sec}s`;
    await sleep(Math.min(1000,pionexCooldownRemaining()+50))
  }
  if($("healthPionexCooldown"))$("healthPionexCooldown").textContent="READY"
}
function pionexRateTask(fn,weight=1){
  const task=pionexQueue.then(async()=>{
    const cool=pionexCooldownRemaining();
    if(cool>0)throw Error(`Pionex rate-limit cooldown · ${Math.ceil(cool/1000)}s`);
    const wait=Math.max(0,pionexNextAllowed-Date.now());
    if(wait)await sleep(wait);
    const spacing=Math.max(PIONEX_MIN_INTERVAL_MS,Math.max(1,weight)*PIONEX_WEIGHT_UNIT_MS);
    pionexNextAllowed=Date.now()+spacing;
    if($("pionexRateState"))$("pionexRateState").textContent=`Rate-safe · ${spacing}ms · weight ${weight}`;
    if($("healthPionexPacing"))$("healthPionexPacing").textContent=`SAFE · ${(spacing/1000).toFixed(2)}s`;
    return fn()
  });
  pionexQueue=task.catch(()=>{});
  return task
}
async function pionexRequest(path,proxyType,proxyArgs=""){
  return pionexRateTask(async()=>{
    const q=`/api/market?type=${encodeURIComponent(proxyType)}${proxyArgs}`;
    try{
      const d=await getJSON(q);
      if(d&&d.result!==false){pionexLastError="";markPionexSuccess();return d}
      const msg=(d?.error||"Pionex unavailable")+(d?.detail?" · "+d.detail:"");
      if(/429|rate.?limit/i.test(msg)){setPionexCooldown(parseRetryMs(msg,d?.retryAfter),msg);throw Error(`Pionex rate-limit cooldown · ${Math.ceil(pionexCooldownRemaining()/1000)}s`)}
      pionexLastError="proxy: "+msg;throw Error("Pionex indisponibil · "+pionexLastError)
    }catch(e){
      let msg=e.message||String(e);
      if(/429|rate.?limit|cooldown/i.test(msg)&&!/^Pionex rate-limit cooldown/.test(msg)){setPionexCooldown(parseRetryMs(msg),msg)}
      if(pionexCooldownRemaining())throw Error(`Pionex rate-limit cooldown · ${Math.ceil(pionexCooldownRemaining()/1000)}s`);
      msg=msg.replace(/^(Pionex indisponibil · )+/,"").replace(/^(proxy: )+/,"");
      pionexLastError="proxy: "+msg;
      throw Error("Pionex indisponibil · "+pionexLastError)
    }
  },pionexWeight(proxyType))
}
function pionexTf(tf){
  return ({"15m":"15M","1h":"60M","4h":"4H","1d":"1D"})[tf]||"4H"
}
function pionexLeveragedBase(base){
  return /(3L|3S|5L|5S|BULL|BEAR)$/i.test(base||"")
}
async function pionexTop100(){
  if(pionexUniverse.length&&Date.now()-pionexUniverseUpdated<120000){
    perfStats.pionexCacheHits++;
    if($("pionexUniverseCount"))$("pionexUniverseCount").textContent=`Universe ${pionexUniverse.length}`;
    if($("pionexUniverseTime"))$("pionexUniverseTime").textContent="Memory cache <120s";
    return pionexUniverse
  }

  const useSavedOrSnapshot=(reason="Pionex unavailable")=>{
    const cached=loadPionexUniverseCache();
    if(cached?.rows?.length){
      pionexUniverse=cached.rows.map(x=>({...x,universeSource:"PIONEX_SAVED"}));
      pionexUniverseUpdated=Date.now();
      const ageH=Math.max(0,(Date.now()-cached.ts)/3600000);
      setScanUniverseStatus("PIONEX_SAVED",`${reason} · saved Pionex universe ${ageH<1?Math.round(ageH*60)+"m":ageH.toFixed(1)+"h"} old · Binance candles`);
      if($("pionexUniverseCount"))$("pionexUniverseCount").textContent=`Universe ${pionexUniverse.length}`;
      if($("pionexUniverseTime"))$("pionexUniverseTime").textContent=`Saved Pionex · ${ageH<1?Math.round(ageH*60)+"m":ageH.toFixed(1)+"h"} old`;
      return pionexUniverse
    }
    pionexUniverse=staticPionexUniverse();pionexUniverseUpdated=Date.now();
    const snapRef=pionexSnapshotState(PIONEX_FALLBACK_SNAPSHOT_DATE);setScanUniverseStatus("PIONEX_SNAPSHOT",`${reason} · embedded Pionex/USDT core · ${snapRef.label} · Binance candles${snapRef.state==="STALE"?" · refresh live/saved universe before relying on membership":""}`);
    if($("pionexUniverseCount"))$("pionexUniverseCount").textContent=`Universe ${pionexUniverse.length}`;
    if($("pionexUniverseTime"))$("pionexUniverseTime").textContent=`Fallback snapshot ${PIONEX_FALLBACK_SNAPSHOT_DATE}`;
    return pionexUniverse
  };

  if(pionexCooldownRemaining()>0){
    return useSavedOrSnapshot(`Pionex cooldown ${Math.ceil(pionexCooldownRemaining()/1000)}s`)
  }

  try{
    const si=await memoRequest(cacheKey("pionex-meta","symbols"),1800000,()=>pionexRequest("/api/v1/common/symbols?type=SPOT","pionex_symbols"));
    const ti=await memoRequest(cacheKey("pionex-meta","tickers"),30000,()=>pionexRequest("/api/v1/market/tickers?type=SPOT","pionex_tickers"));
    const symbols=si?.data?.symbols||[],tickers=ti?.data?.tickers||[],tm=new Map(tickers.map(x=>[x.symbol,x]));
    const rows=symbols.filter(x=>{
      const base=(x.baseCurrency||"").toUpperCase(),quote=(x.quoteCurrency||"").toUpperCase();
      return x.type==="SPOT"&&quote==="USDT"&&x.enable!==false&&!PIONEX_STABLE_BASES.has(base)&&!pionexLeveragedBase(base)&&tm.has(x.symbol)
    }).map(x=>{
      const t=tm.get(x.symbol)||{},turnover=Number(t.amount||0),close=Number(t.close||0),open=Number(t.open||0);
      return {symbol:x.symbol,base:x.baseCurrency.toUpperCase(),turnover,close,change:open?((close/open)-1)*100:0,universeSource:"PIONEX_LIVE"}
    }).filter(x=>x.turnover>0&&x.close>0).sort((a,b)=>b.turnover-a.turnover).slice(0,100);
    if(!rows.length)throw Error("Pionex returned empty universe");
    pionexUniverse=rows;pionexUniverseUpdated=Date.now();savePionexUniverseCache(rows);
    setScanUniverseStatus("PIONEX_LIVE","Live Pionex SPOT/USDT universe · Binance candles");
    if($("pionexUniverseCount"))$("pionexUniverseCount").textContent=`Universe ${rows.length}`;
    if($("pionexUniverseTime"))$("pionexUniverseTime").textContent=`Pionex live · ${new Date().toLocaleTimeString()}`;
    return rows
  }catch(e){
    return useSavedOrSnapshot((e.message||"Pionex unavailable").replace(/^(Pionex indisponibil · proxy: )+/,""))
  }
}
async function pionexKlines(pionexSymbol,tf,limit=300){
  const interval=pionexTf(tf),safe=encodeURIComponent(pionexSymbol),lim=Math.min(500,Math.max(60,limit)),key=cacheKey("pionex-klines",`${pionexSymbol}|${interval}|${lim}`),ttl=tf==="15m"?30000:tf==="1h"?60000:tf==="4h"?120000:300000;
  const beforeHits=perfStats.cacheHits;
  const d=await memoRequest(key,ttl,()=>retryTask(()=>withTimeout(pionexRequest(`/api/v1/market/klines?symbol=${safe}&interval=${interval}&limit=${lim}`,"pionex_klines",`&symbol=${safe}&interval=${encodeURIComponent(interval)}&limit=${lim}`),12000,"Pionex"),1,220));
  if(perfStats.cacheHits>beforeHits)perfStats.pionexCacheHits++;
  const rows=d?.data?.klines||[];
  return rows.map(x=>{
    const ts=Number(x.time),o=Number(x.open),h=Number(x.high),l=Number(x.low),c=Number(x.close),v=Number(x.volume);
    return [ts,String(o),String(h),String(l),String(c),String(v),ts+1,String(v*c)]
  }).sort((a,b)=>a[0]-b[0])
}
// v74.6: lista perechilor SPOT de pe Binance, o data pe ora. O moneda Pionex
// care nu e pe Binance producea cate 8 erori CORS (cate o gazda) la fiecare scan.
function binanceSimboluriSpot(){
  return memoRequest(cacheKey("binance-simboluri","spot"),3600000,async()=>{
    const d=await market("/ticker/price");
    if(!Array.isArray(d)||d.length<50)throw Error("lista Binance incompleta");
    return new Set(d.map(x=>String(x.symbol||"").toUpperCase()))
  })
}
function scanButonStop(activ){const x=$("scanCancelBtn");if(x){x.disabled=!activ;x.hidden=!activ}}
async function pionexUniverseBinanceKlines(item,tf,limit=300){
  const symbol=`${String(item.base||"").toUpperCase()}USDT`;
  return klines(symbol,tf,limit)
}
function scannerStatsFrom4h(rows,item){
  const a=(rows||[]).slice(-6),first=a[0],last=a.at(-1);
  let turnover=0;for(const x of a)turnover+=Number(x[7]||0);
  const p0=Number(first?.[1]||0),p1=Number(last?.[4]||0),change=p0?((p1/p0)-1)*100:(+item.change||0);
  return {turnover:turnover||(+item.turnover||0),change}
}
async function pionexScanFast(item){
  const mode=$("mode")?$("mode").value:"auto",j=await pionexUniverseBinanceKlines(item,"4h",320);
  if(!j||j.length<80)throw Error("Insufficient Binance history");
  const q=calc(j,mode),ms=scannerStatsFrom4h(j,item);
  return {c:item.base,pionexSymbol:item.symbol,avg:q.score,dir:q.ver,conf:q.confluence,adx:q.adx,regime:q.regime,turnover:ms.turnover,change:ms.change,source:"BINANCE",universeSource:item.universeSource||"PIONEX",trend:q.trendScore,mom:q.momScore,structure:q.structureScore,volume:q.volScore,chop:q.chop,efficiency:q.efficiency,hurst:q.hurst,rvPercentile:q.rvPercentile}
}
async function pionexScanDeep(item){
  const mode=$("mode")?$("mode").value:"auto",tfs=["15m","1h","4h","1d"],raw={};
  const m=(await Promise.all(tfs.map(async tf=>{try{const rows=await pionexUniverseBinanceKlines(item,tf,300);raw[tf]=rows;return {tf,...calc(rows,mode)}}catch{return null}}))).filter(Boolean);
  if(!m.length)throw Error("No Binance candles for this Pionex coin");
  const mc=mtfComposite(m),anchor=m.find(x=>x.tf==="4h")||m[0],ms=scannerStatsFrom4h(raw["4h"]||[],item);
  return {c:item.base,pionexSymbol:item.symbol,avg:mc.avg,dir:mc.comp,conf:anchor.confluence,adx:anchor.adx,regime:anchor.regime,turnover:ms.turnover,change:ms.change,source:"BINANCE",universeSource:item.universeSource||"PIONEX",trend:anchor.trendScore,mom:anchor.momScore,structure:anchor.structureScore,volume:anchor.volScore,chop:anchor.chop,efficiency:anchor.efficiency,hurst:anchor.hurst,rvPercentile:anchor.rvPercentile}
}
function selectPionexScan(c){
  setAssetClass("CRYPTO");setAnalysisSource("BINANCE");$("symbol").value=c;localStorage.setItem("lastCrypto",c);localStorage.setItem("last",c);
  show("dash");toast(`${c} · coin din universul Pionex · analiză principală Binance`,"good");analyze(true)
}
function sleep(ms){return new Promise(r=>setTimeout(r,ms))}

function pionexSpotSymbolFromInput(){
  const base=coin(norm($("symbol").value));
  return `${base}_USDT`
}
async function pionexTrades(symbol,limit=500){
  const lim=Math.max(10,Math.min(500,limit)),safe=encodeURIComponent(symbol),key=cacheKey("pionex-trades",`${symbol}|${lim}`);
  return memoRequest(key,5000,()=>retryTask(()=>withTimeout(pionexRequest(`/api/v1/market/trades?symbol=${safe}&limit=${lim}`,"pionex_trades",`&symbol=${safe}&limit=${lim}`),9000,"Pionex trades"),1,180))
}
async function pionexDepthSnapshot(symbol,limit=100){
  const lim=Math.max(1,Math.min(1000,limit)),safe=encodeURIComponent(symbol),key=cacheKey("pionex-depth",`${symbol}|${lim}`);
  return memoRequest(key,5000,()=>retryTask(()=>withTimeout(pionexRequest(`/api/v1/market/depth?symbol=${safe}&limit=${lim}`,"pionex_depth",`&symbol=${safe}&limit=${lim}`),9000,"Pionex depth"),1,180))
}
function quantile(arr,q){
  if(!arr.length)return 0;const a=[...arr].sort((x,y)=>x-y),i=(a.length-1)*q,l=Math.floor(i),h=Math.ceil(i);
  return l===h?a[l]:a[l]+(a[h]-a[l])*(i-l)
}
function parsePionexTrades(payload){
  const raw=payload?.data?.trades||[];
  return raw.map(x=>({symbol:x.symbol||"",id:x.tradeId||"",price:Number(x.price),size:Number(x.size),side:String(x.side||"").toUpperCase(),timestamp:Number(x.timestamp)}))
    .filter(x=>Number.isFinite(x.price)&&x.price>0&&Number.isFinite(x.size)&&x.size>0&&(x.side==="BUY"||x.side==="SELL"))
    .sort((a,b)=>a.timestamp-b.timestamp)
}
function tradeFlowStats(trades){
  if(!trades.length)return null;
  let buyNotional=0,sellNotional=0,buyCount=0,sellCount=0,cvd=0,series=[],notionals=[];
  for(const t of trades){
    const n=t.price*t.size,sgn=t.side==="BUY"?1:-1;
    notionals.push(n);cvd+=sgn*n;series.push(cvd);
    if(t.side==="BUY"){buyNotional+=n;buyCount++}else{sellNotional+=n;sellCount++}
  }
  const total=buyNotional+sellNotional,delta=buyNotional-sellNotional,deltaPct=total?delta/total*100:0,largeThreshold=quantile(notionals,.90);
  let largeBuy=0,largeSell=0;
  for(const t of trades){let n=t.price*t.size;if(n>=largeThreshold){if(t.side==="BUY")largeBuy+=n;else largeSell+=n}}
  const first=trades[0],last=trades[trades.length-1],priceChange=first.price?(last.price/first.price-1)*100:0,spanSec=Math.max(1,(last.timestamp-first.timestamp)/1000),pace=trades.length/spanSec,largeTotal=largeBuy+largeSell,largeDeltaPct=largeTotal?(largeBuy-largeSell)/largeTotal*100:0;
  let divergence="NONE";if(priceChange>0&&deltaPct<0)divergence="BEAR FLOW DIV";else if(priceChange<0&&deltaPct>0)divergence="BULL FLOW DIV";
  return {buyNotional,sellNotional,buyCount,sellCount,total,delta,deltaPct,cvd,series,largeThreshold,largeBuy,largeSell,largeDeltaPct,priceChange,spanSec,pace,divergence,firstPrice:first.price,lastPrice:last.price}
}
function parsePionexDepth(payload){
  const d=payload?.data||{},normSide=a=>(a||[]).map(x=>[Number(x[0]),Number(x[1])]).filter(x=>Number.isFinite(x[0])&&x[0]>0&&Number.isFinite(x[1])&&x[1]>0);
  const bids=normSide(d.bids).sort((a,b)=>b[0]-a[0]),asks=normSide(d.asks).sort((a,b)=>a[0]-b[0]);
  return {bids,asks,updateTime:Number(d.updateTime||payload?.timestamp||0)}
}
function depthNotional(levels,n){return levels.slice(0,n).reduce((z,x)=>z+x[0]*x[1],0)}
function depthStats(book){
  const {bids,asks}=book;if(!bids.length||!asks.length)return null;
  const bid=bids[0][0],ask=asks[0][0],mid=(bid+ask)/2,spreadBps=mid?(ask-bid)/mid*10000:0;
  const b10=depthNotional(bids,10),a10=depthNotional(asks,10),b50=depthNotional(bids,50),a50=depthNotional(asks,50);
  const imb=(b,a)=>(b+a)?(b-a)/(b+a)*100:0,imb10=imb(b10,a10),imb50=imb(b50,a50);
  const bq=bids[0][1],aq=asks[0][1],micro=(bq+aq)?(ask*bq+bid*aq)/(bq+aq):mid,microEdgeBps=mid?(micro-mid)/mid*10000:0;
  const bw=[...bids.slice(0,50)].sort((x,y)=>y[0]*y[1]-x[0]*x[1])[0],aw=[...asks.slice(0,50)].sort((x,y)=>y[0]*y[1]-x[0]*x[1])[0];
  return {bid,ask,mid,spreadBps,b10,a10,b50,a50,imb10,imb50,micro,microEdgeBps,bidWall:bw,askWall:aw}
}
function estimateSlippage(levels,notional,side){
  let remain=notional,qty=0,cost=0,best=levels[0]?.[0]||0;
  for(const [p,size] of levels){
    const lvlNotional=p*size,take=Math.min(remain,lvlNotional),q=take/p;qty+=q;cost+=take;remain-=take;if(remain<=1e-9)break
  }
  if(remain>1e-6||qty<=0||best<=0)return null;
  const avg=cost/qty,slipBps=side==="BUY"?(avg/best-1)*10000:(1-avg/best)*10000;
  return {avg,slipBps}
}
function microstructureComposite(flow,depth){
  if(!flow||!depth)return {score:0,bias:"BALANCED",reason:"Insufficient microstructure data"};
  const d=Math.max(-100,Math.min(100,flow.deltaPct)),l=Math.max(-100,Math.min(100,flow.largeDeltaPct)),b=Math.max(-100,Math.min(100,depth.imb10)),m=Math.max(-100,Math.min(100,depth.microEdgeBps*20));
  const score=.40*d+.20*l+.30*b+.10*m,bias=score>=18?"BUY PRESSURE":score<=-18?"SELL PRESSURE":"BALANCED";
  return {score,bias,reason:`Trade Δ ${d.toFixed(0)}% · Book ${b.toFixed(0)}% · Large trades ${l.toFixed(0)}%`}
}
function absorptionHeuristic(flow,depth){
  if(!flow||!depth)return "N/A";
  if(flow.deltaPct<=-20&&flow.priceChange>=-.08&&depth.imb10>=15)return "BID ABSORPTION";
  if(flow.deltaPct>=20&&flow.priceChange<=.08&&depth.imb10<=-15)return "ASK ABSORPTION";
  return "NONE"
}
function drawMicroCvd(series){
  const cv=$("microCvdChart");if(!cv)return;const ctx=cv.getContext("2d"),w=cv.width,h=cv.height,pad=18;ctx.clearRect(0,0,w,h);
  if(!series||series.length<2)return;const mn=Math.min(...series,0),mx=Math.max(...series,0),rg=mx-mn||1,x=i=>pad+i/(series.length-1)*(w-2*pad),y=v=>h-pad-(v-mn)/rg*(h-2*pad);
  ctx.strokeStyle="#203148";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(pad,y(0));ctx.lineTo(w-pad,y(0));ctx.stroke();
  ctx.strokeStyle="#69a7ff";ctx.lineWidth=2;ctx.beginPath();series.forEach((v,i)=>i?ctx.lineTo(x(i),y(v)):ctx.moveTo(x(i),y(v)));ctx.stroke()
}
let microAuto=false,microTimer=null,microLoading=false;
function toggleMicroAuto(){
  microAuto=!microAuto;$("microAutoBtn").textContent=microAuto?"Auto ON":"Auto OFF";
  if(microTimer){clearInterval(microTimer);microTimer=null}
  if(microAuto){if(!pionexScannerActive)loadPionexMicrostructure(true);microTimer=setInterval(()=>{if($("micro").classList.contains("on")&&!pionexScannerActive&&!pionexCooldownRemaining())loadPionexMicrostructure(true)},30000)}
}
async function loadPionexMicrostructure(force=false){
  if(assetClass()==="STOCKS"){if($("microBias"))$("microBias").textContent="N/A · STOCK MODE";return}
  if(microLoading)return;if(pionexScannerActive&&!force){if($("microReason"))$("microReason").textContent="Paused while Pionex scanner is active.";return}microLoading=true;
  const ps=pionexSpotSymbolFromInput(),req=currentDecisionIdentity(norm($("symbol").value));$("microSymbol").textContent=ps;$("microReason").textContent="Loading Pionex trades + depth…";
  try{
    if(force){requestCache.delete(cacheKey("pionex-trades",`${ps}|500`));requestCache.delete(cacheKey("pionex-depth",`${ps}|100`))}
    const [trPayload,dpPayload]=await Promise.all([pionexTrades(ps,500),pionexDepthSnapshot(ps,100)]);if(!requestIdentityStillCurrent(req,{ignoreTf:true}))return;
    const trades=parsePionexTrades(trPayload),flow=tradeFlowStats(trades),book=parsePionexDepth(dpPayload),depth=depthStats(book);
    if(!flow||!depth)throw Error("Pionex returned insufficient trades/depth");
    const comp=microstructureComposite(flow,depth),abs=absorptionHeuristic(flow,depth);
    window.__microState=stampDecisionState({market:"CRYPTO",symbol:req.symbol,providerSymbol:ps,source:req.source,trades,flow,book,depth,composite:comp,absorption:abs,updated:Date.now()},req);
    $("microBias").textContent=comp.bias;$("microBias").className="microBias "+(comp.bias==="BUY PRESSURE"?"good":comp.bias==="SELL PRESSURE"?"bad":"neutral");$("microScore").textContent=(comp.score>=0?"+":"")+comp.score.toFixed(1);$("microReason").textContent=comp.reason;$("microUpdated").textContent=new Date().toLocaleTimeString();
    $("trueDelta").textContent=(flow.delta>=0?"+":"")+compact(Math.abs(flow.delta))+" USDT";$("trueDelta").className=flow.delta>=0?"good":"bad";$("trueDeltaPct").textContent=(flow.deltaPct>=0?"+":"")+flow.deltaPct.toFixed(1)+"%";$("trueDeltaPct").className=flow.deltaPct>=0?"good":"bad";$("trueCvd").textContent=(flow.cvd>=0?"+":"")+compact(Math.abs(flow.cvd))+" USDT";$("buySellNotional").textContent=`${compact(flow.buyNotional)} / ${compact(flow.sellNotional)}`;$("tradePace").textContent=flow.pace.toFixed(2)+" trades/s";$("largeTradeBias").textContent=(flow.largeDeltaPct>=0?"+":"")+flow.largeDeltaPct.toFixed(1)+"%";
    $("buyTradeCount").textContent=flow.buyCount;$("sellTradeCount").textContent=flow.sellCount;$("avgBuyTrade").textContent=flow.buyCount?compact(flow.buyNotional/flow.buyCount)+" USDT":"—";$("avgSellTrade").textContent=flow.sellCount?compact(flow.sellNotional/flow.sellCount)+" USDT":"—";$("largeBuyNotional").textContent=compact(flow.largeBuy)+" USDT";$("largeSellNotional").textContent=compact(flow.largeSell)+" USDT";$("microPriceChange").textContent=(flow.priceChange>=0?"+":"")+flow.priceChange.toFixed(3)+"%";$("microDivergence").textContent=flow.divergence;$("microDivergence").className=flow.divergence==="BULL FLOW DIV"?"good":flow.divergence==="BEAR FLOW DIV"?"bad":"neutral";drawMicroCvd(flow.series);
    $("pionexSpread").textContent=depth.spreadBps.toFixed(2)+" bps";$("pionexImb10").textContent=(depth.imb10>=0?"+":"")+depth.imb10.toFixed(1)+"%";$("pionexImb10").className=depth.imb10>=10?"good":depth.imb10<=-10?"bad":"neutral";$("pionexImb50").textContent=(depth.imb50>=0?"+":"")+depth.imb50.toFixed(1)+"%";$("micropriceEdge").textContent=(depth.microEdgeBps>=0?"+":"")+depth.microEdgeBps.toFixed(2)+" bps";$("bidWall").textContent=`${num(depth.bidWall[0])} · ${compact(depth.bidWall[0]*depth.bidWall[1])}`;$("askWall").textContent=`${num(depth.askWall[0])} · ${compact(depth.askWall[0]*depth.askWall[1])}`;
    const wallBid=depth.bidWall[0]*depth.bidWall[1],wallAsk=depth.askWall[0]*depth.askWall[1],wallPct=(wallBid+wallAsk)?(wallBid-wallAsk)/(wallBid+wallAsk)*100:0;$("wallPressure").textContent=(wallPct>=0?"+":"")+wallPct.toFixed(1)+"%";$("wallPressure").className=wallPct>=10?"good":wallPct<=-10?"bad":"neutral";$("absorptionState").textContent=abs;$("absorptionState").className=abs==="BID ABSORPTION"?"good":abs==="ASK ABSORPTION"?"bad":"neutral";
    const totalDepth=depth.b10+depth.a10,bidPct=totalDepth?100*depth.b10/totalDepth:50;$("pionexBidMeter").style.width=bidPct+"%";$("pionexAskMeter").style.width=(100-bidPct)+"%";
    for(const n of [100,500,1000]){let buy=estimateSlippage(book.asks,n,"BUY"),sell=estimateSlippage(book.bids,n,"SELL"),el=$("slip"+n);el.textContent=buy&&sell?`BUY ${buy.slipBps.toFixed(2)} · SELL ${sell.slipBps.toFixed(2)} bps`:"Insufficient visible depth"}
    $("tradeTape").innerHTML=trades.slice(-30).reverse().map(t=>`<div class="tapeRow"><b class="${t.side==="BUY"?"good":"bad"}">${t.side}</b><span>${num(t.price)}</span><span>${t.size.toFixed(6)}</span><span>${compact(t.price*t.size)}</span></div>`).join("");
  }catch(e){
    $("microBias").textContent="UNAVAILABLE";$("microBias").className="microBias neutral";$("microReason").textContent="Pionex microstructure unavailable: "+e.message;$("microUpdated").textContent=new Date().toLocaleTimeString()
  }finally{microLoading=false}
}

function analysisSource(){
  if(assetClass()==="STOCKS")return "TWELVEDATA";
  const ui=$("analysisSource")?.value,stored=localStorage.getItem("analysisProvider"),cfg=typeof appSettings==="function"?appSettings().spotProvider:null;
  return (ui&&ui!=="TWELVEDATA"?ui:null)||stored||cfg||"BINANCE"
}
function setAnalysisSource(src){
  if(assetClass()==="STOCKS"){if($("analysisSource"))$("analysisSource").value="TWELVEDATA";return}
  const v=src==="PIONEX"?"PIONEX":"BINANCE";
  localStorage.setItem("analysisProvider",v);if($("analysisSource"))$("analysisSource").value=v;
  let cfg=appSettings();cfg.spotProvider=v;putSettings(cfg);stopProviderLive();invalidateDecisionContext(null,v,null,true);updateSourceLineage(v);if(window.__radarState)window.__radarState=null;toast(`Primary crypto source: ${v}`,"good");renderProfitReadiness(false)
}
function updateSourceLineage(src=analysisSource()){
  const stocks=assetClass()==="STOCKS",p=stocks?"TWELVE DATA":src==="PIONEX"?"PIONEX":"BINANCE";
  if($("topSource"))$("topSource").textContent=p;if($("dashSourceLock"))$("dashSourceLock").textContent=p+" LOCK";
  if($("sourceSpot"))$("sourceSpot").textContent=p;if($("sourceMtf"))$("sourceMtf").textContent=p;
  if($("sourceLive"))$("sourceLive").textContent=stocks?"TWELVE DATA REST":p==="PIONEX"?"PIONEX REST":"BINANCE WS";
  if($("sourceMicro"))$("sourceMicro").textContent=stocks?"US SESSION / VWAP":"PIONEX";
  if($("sourceDeriv"))$("sourceDeriv").textContent=stocks?"QQQ / SPY CONTEXT":"BINANCE FUTURES";
  if($("sourceNote"))$("sourceNote").textContent=stocks?
    "US stock candles, ticker, chart, MTF, correlation, backtest and OOS use Twelve Data through the Cloudflare server. Crypto derivatives and Pionex microstructure are not mixed into stock signals.":
    p==="PIONEX"?"Main crypto candles, ticker, historical analogs, chart, MTF, correlation, backtest and OOS are Pionex-native. Binance Futures remains separately labeled external context.":
    "Main crypto candles, ticker, historical analogs, chart, MTF, correlation, backtest and OOS use Binance direct browser data. Pionex scanner/microstructure remain separately labeled.";
  if($("marketContextSubtitle"))$("marketContextSubtitle").textContent=stocks?"QQQ / US equity relative context":"Cross-market crypto context"
}
async function pionexTickerSymbol(pionexSymbol){
  const key=cacheKey("pionex-ticker",pionexSymbol);
  return memoRequest(key,5000,async()=>{
    const d=await pionexRequest("/api/v1/market/tickers?type=SPOT","pionex_tickers"),rows=d?.data?.tickers||[],t=rows.find(x=>x.symbol===pionexSymbol);
    if(!t)throw Error(`Pionex symbol unavailable: ${pionexSymbol}`);
    const close=Number(t.close),open=Number(t.open),amount=Number(t.amount||0);
    return {symbol:pionexSymbol,lastPrice:String(close),priceChangePercent:String(open?((close/open)-1)*100:0),quoteVolume:String(amount),highPrice:String(t.high||""),lowPrice:String(t.low||"")}
  })
}
async function analysisKlines(sym,tf,limit=300,src=analysisSource()){
  if(src==="TWELVEDATA")return stockSeries(stockSymbol(sym),tf,limit);
  return src==="PIONEX"?pionexKlines(`${coin(sym)}_USDT`,tf,Math.min(500,limit)):klines(sym,tf,limit)
}
async function analysisTicker(sym,src=analysisSource()){
  if(src==="TWELVEDATA")return stockTicker(stockSymbol(sym));
  return src==="PIONEX"?pionexTickerSymbol(`${coin(sym)}_USDT`):ticker(sym)
}
async function analysisMtfData(sym,src=analysisSource()){
  const mode=$("mode")?$("mode").value:"auto",tfs=["15m","1h","4h","1d"],errors={};
  const jobs=await Promise.all(tfs.map(async tf=>{try{return {tf,...calc(bareInchise(await analysisKlines(sym,tf,300,src),tf,Date.now(),src),mode)}}catch(e){errors[tf]=String(e?.message||e||"MTF unavailable");return null}}));
  const rows=jobs.filter(Boolean);rows.expected=tfs.length;rows.coverage=rows.length/tfs.length;rows.missing=tfs.filter(tf=>!rows.some(x=>x.tf===tf));rows.errors=errors;rows.identity={market:assetClass(),symbol:sym,source:src,ts:Date.now()};return rows
}
let pionexLiveTimer=null,pionexLiveSeq=0;
function stopPionexLive(){
  pionexLiveSeq++;if(pionexLiveTimer){clearInterval(pionexLiveTimer);pionexLiveTimer=null}
}
function stopBinanceLive(){
  try{liveSocketSeq++;if(wsReconnectTimer){clearTimeout(wsReconnectTimer);wsReconnectTimer=null}if(liveSocket){liveSocket.onclose=null;liveSocket.close();liveSocket=null}}catch{}
  if($("wsDot"))$("wsDot")?.classList.remove("live")
}
function stopProviderLive(){stopPionexLive();stopBinanceLive();stopStockLive()}
function startPionexLive(sym){
  stopProviderLive();const seq=++pionexLiveSeq;
  async function poll(){
    if(seq!==pionexLiveSeq)return;
    try{
      const d=await analysisTicker(sym,"PIONEX");if(seq!==pionexLiveSeq)return;
      const px=Number(d.lastPrice),ch=Number(d.priceChangePercent);lastWsTick=Date.now();markFresh("ws");
      if($("wsStatus")){$("wsStatus").textContent="PIONEX LIVE";$("wsStatus").classList.remove("wsStale")}
      if($("wsDot"))$("wsDot")?.classList.add("live");
      if(window.__radarState&&window.__radarState.symbol===sym&&window.__radarState.source==="PIONEX"){
        $("heroPrice").textContent=num(px);$("price").textContent=num(px);$("hero24").textContent=(ch>=0?"+":"")+ch.toFixed(2)+"%";$("change").textContent=(ch>=0?"+":"")+ch.toFixed(2)+"%"
      }
    }catch{
      if($("wsStatus")){$("wsStatus").textContent="PIONEX RETRY";$("wsStatus").classList.add("wsStale")}
      if($("wsDot"))$("wsDot")?.classList.remove("live")
    }
  }
  if(!pionexScannerActive&&!pionexCooldownRemaining())poll();pionexLiveTimer=setInterval(()=>{if(!pionexScannerActive&&!pionexCooldownRemaining())poll()},30000)
}
function stopStockLive(){stockLiveSeq++;if(stockLiveTimer){clearInterval(stockLiveTimer);stockLiveTimer=null}}
function startStockLive(sym){
  stopPionexLive();stopBinanceLive();stopStockLive();const seq=++stockLiveSeq;
  async function poll(){if(seq!==stockLiveSeq)return;try{const d=await stockTicker(sym);if(seq!==stockLiveSeq)return;const px=botiNr(d.lastPrice),ch=botiNr(d.priceChangePercent);lastWsTick=Date.now();markFresh("ws");if($("wsStatus")){$("wsStatus").textContent="US STOCKS";$("wsStatus").classList.remove("wsStale")}if($("wsDot"))$("wsDot")?.classList.add("live");if(window.__radarState?.symbol===sym&&window.__radarState?.source==="TWELVEDATA"){$("heroPrice").textContent=px===null?"—":num(px);$("price").textContent=px===null?"—":num(px);$("hero24").textContent=ch===null?"—":pctText(ch);$("change").textContent=ch===null?"—":pctText(ch)}}catch{if($("wsStatus"))$("wsStatus").textContent="STOCK DATA RETRY"}}
  poll();stockLiveTimer=setInterval(poll,30000)
}
function startProviderLive(sym,src=analysisSource()){
  if(src==="TWELVEDATA")startStockLive(sym);else if(src==="PIONEX")startPionexLive(sym);else{stopPionexLive();stopStockLive();startLiveSocket(sym)}
}
function sma(a,n){let o=Array(a.length).fill(NaN),sum=0;for(let i=0;i<a.length;i++){sum+=a[i];if(i>=n)sum-=a[i-n];if(i>=n-1)o[i]=sum/n}return o}
function stddev(a,n){let o=Array(a.length).fill(NaN);for(let i=n-1;i<a.length;i++){let m=0;for(let z=i-n+1;z<=i;z++)m+=a[z];m/=n;let v=0;for(let z=i-n+1;z<=i;z++)v+=(a[z]-m)**2;o[i]=Math.sqrt(v/n)}return o}
function ATR(h,l,c,n=14){let tr=Array(c.length).fill(0),o=Array(c.length).fill(0);tr[0]=h[0]-l[0];for(let i=1;i<c.length;i++)tr[i]=Math.max(h[i]-l[i],Math.abs(h[i]-c[i-1]),Math.abs(l[i]-c[i-1]));let seed=0;for(let i=0;i<c.length;i++){if(i<n){seed+=tr[i];o[i]=seed/(i+1)}else{o[i]=(o[i-1]*(n-1)+tr[i])/n}}return o}
function DMI(h,l,c,n=14){
 let len=c.length,tr=Array(len).fill(0),pd=Array(len).fill(0),md=Array(len).fill(0);
 for(let i=1;i<len;i++){let up=h[i]-h[i-1],dn=l[i-1]-l[i];pd[i]=up>dn&&up>0?up:0;md[i]=dn>up&&dn>0?dn:0;tr[i]=Math.max(h[i]-l[i],Math.abs(h[i]-c[i-1]),Math.abs(l[i]-c[i-1]))}
 let atr=Array(len).fill(0),ps=Array(len).fill(0),ms=Array(len).fill(0),pdi=Array(len).fill(0),mdi=Array(len).fill(0),dx=Array(len).fill(0),adx=Array(len).fill(0);
 for(let i=1;i<len;i++){if(i===1){atr[i]=tr[i];ps[i]=pd[i];ms[i]=md[i]}else{atr[i]=atr[i-1]-(atr[i-1]/n)+tr[i];ps[i]=ps[i-1]-(ps[i-1]/n)+pd[i];ms[i]=ms[i-1]-(ms[i-1]/n)+md[i]}pdi[i]=atr[i]?100*ps[i]/atr[i]:0;mdi[i]=atr[i]?100*ms[i]/atr[i]:0;dx[i]=(pdi[i]+mdi[i])?100*Math.abs(pdi[i]-mdi[i])/(pdi[i]+mdi[i]):0;adx[i]=i===1?dx[i]:(adx[i-1]*(n-1)+dx[i])/n}
 return {pdi,mdi,adx}
}
function stochRSI(r,n=14){let o=Array(r.length).fill(50);for(let i=n-1;i<r.length;i++){let w=r.slice(i-n+1,i+1),mn=Math.min(...w),mx=Math.max(...w);o[i]=mx===mn?50:100*(r[i]-mn)/(mx-mn)}return o}
function rollingVWAP(h,l,c,v,n=50){let o=Array(c.length).fill(NaN);for(let i=0;i<c.length;i++){let a=Math.max(0,i-n+1),pv=0,vs=0;for(let z=a;z<=i;z++){let tp=(h[z]+l[z]+c[z])/3;pv+=tp*v[z];vs+=v[z]}o[i]=vs?pv/vs:c[i]}return o}
function superTrend(h,l,c,atr,n=14,mult=2.8){
 let len=c.length,up=Array(len).fill(0),dn=Array(len).fill(0),trend=Array(len).fill(1),line=Array(len).fill(0);
 for(let i=0;i<len;i++){let mid=(h[i]+l[i])/2,bu=mid+mult*atr[i],bd=mid-mult*atr[i];if(i===0){up[i]=bu;dn[i]=bd;line[i]=bd;continue}up[i]=(bu<up[i-1]||c[i-1]>up[i-1])?bu:up[i-1];dn[i]=(bd>dn[i-1]||c[i-1]<dn[i-1])?bd:dn[i-1];if(c[i]>up[i-1])trend[i]=1;else if(c[i]<dn[i-1])trend[i]=-1;else trend[i]=trend[i-1];line[i]=trend[i]===1?dn[i]:up[i]}
 return {trend,line}
}
function smcState(h,l,c,v,volOk=true){
 let i=c.length-1,start=Math.max(5,i-20),ph=Math.max(...h.slice(start,i)),pl=Math.min(...l.slice(start,i));
 let bosUp=c[i]>ph,bosDown=c[i]<pl,sweepHigh=h[i]>ph&&c[i]<ph,sweepLow=l[i]<pl&&c[i]>pl;
 let fvg="NONE";for(let z=Math.max(2,i-12);z<=i;z++){if(l[z]>h[z-2])fvg="BULL";else if(h[z]<l[z-2])fvg="BEAR"}
 let volBase=v.slice(Math.max(0,i-20),i).reduce((a,b)=>a+b,0)/Math.max(1,Math.min(20,i));
 // fara volum in fereastra nu se poate spune "breakout pe volum slab" - ramane doar sweep-ul
 let trap=(volOk&&((bosUp&&v[i]<volBase*.9)||(bosDown&&v[i]<volBase*.9)))||sweepHigh||sweepLow;
 let score=50;if(bosUp)score+=24;if(bosDown)score-=24;if(sweepLow)score+=16;if(sweepHigh)score-=16;if(fvg==="BULL")score+=8;if(fvg==="BEAR")score-=8;if(trap&&bosUp)score-=10;if(trap&&bosDown)score+=10;
 return {bos:bosUp?"BOS UP":bosDown?"BOS DOWN":"NONE",sweep:sweepLow?"SWEEP LOW":sweepHigh?"SWEEP HIGH":trap?"LOW-VOL BREAK":"NONE",fvg,trap,score:Math.max(0,Math.min(100,score)),prevHigh:ph,prevLow:pl}
}
function profileParams(mode,atrPct,adx){
 if(mode==="scalp")return {st:2.0,breakout:12,signal:66};
 if(mode==="swing")return {st:3.2,breakout:30,signal:64};
 if(mode==="intraday")return {st:2.6,breakout:20,signal:65};
 if(adx>=27)return {st:2.8,breakout:22,signal:64};
 if(atrPct>=3)return {st:3.0,breakout:18,signal:67};
 return {st:2.4,breakout:18,signal:66};
}

function MFI(h,l,c,v,n=14){
 let tp=c.map((x,i)=>(h[i]+l[i]+x)/3),pos=Array(c.length).fill(0),neg=Array(c.length).fill(0),o=Array(c.length).fill(50);
 for(let i=1;i<c.length;i++){let mf=tp[i]*v[i];if(tp[i]>=tp[i-1])pos[i]=mf;else neg[i]=mf}
 for(let i=n;i<c.length;i++){let ps=0,ns=0;for(let z=i-n+1;z<=i;z++){ps+=pos[z];ns+=neg[z]}o[i]=ns===0?100:100-100/(1+ps/ns)}
 return o
}
function OBV(c,v){
 let o=Array(c.length).fill(0);for(let i=1;i<c.length;i++)o[i]=o[i-1]+(c[i]>c[i-1]?v[i]:c[i]<c[i-1]?-v[i]:0);return o
}
function ichimoku(h,l,c){
 let mid=(n,i)=>{let a=Math.max(0,i-n+1);return (Math.max(...h.slice(a,i+1))+Math.min(...l.slice(a,i+1)))/2};
 let i=c.length-1,tenkan=mid(9,i),kijun=mid(26,i),spanA=(tenkan+kijun)/2,spanB=mid(52,i);
 let state=c[i]>Math.max(spanA,spanB)?"BULL":c[i]<Math.min(spanA,spanB)?"BEAR":"CLOUD";
 return {tenkan,kijun,spanA,spanB,state}
}
function rsiDivergence(c,r){
 let i=c.length-1,w=24,mid=i-10;if(mid<10)return "NONE";
 let p1=c.slice(i-w,mid),p2=c.slice(mid,i+1),r1=r.slice(i-w,mid),r2=r.slice(mid,i+1);
 let low1=Math.min(...p1),low2=Math.min(...p2),hi1=Math.max(...p1),hi2=Math.max(...p2);
 let rl1=r1[p1.indexOf(low1)],rl2=r2[p2.indexOf(low2)],rh1=r1[p1.indexOf(hi1)],rh2=r2[p2.indexOf(hi2)];
 if(low2<low1&&rl2>rl1+3)return "BULL DIV";
 if(hi2>hi1&&rh2<rh1-3)return "BEAR DIV";
 return "NONE"
}

function CMF(h,l,c,v,n=20){
 let mfv=Array(c.length).fill(0),o=Array(c.length).fill(0);
 for(let i=0;i<c.length;i++){let den=(h[i]-l[i])||1e-9;let mfm=((c[i]-l[i])-(h[i]-c[i]))/den;mfv[i]=mfm*v[i]}
 for(let i=0;i<c.length;i++){let a=Math.max(0,i-n+1),mf=0,vol=0;for(let z=a;z<=i;z++){mf+=mfv[z];vol+=v[z]}o[i]=vol?mf/vol:0}
 return o
}
function levelLadder(h,l,c,look=50){
 let i=c.length-1,a=Math.max(0,i-look+1),hh=Math.max(...h.slice(a,i+1)),ll=Math.min(...l.slice(a,i+1)),last=c[i];
 let rng=Math.max(1e-9,hh-ll),pivot=(hh+ll+last)/3;
 let s1=pivot-rng*.236,s2=pivot-rng*.382,s3=pivot-rng*.618;
 let r1=pivot+rng*.236,r2=pivot+rng*.382,r3=pivot+rng*.618;
 let nearest=last<pivot?(Math.abs(last-s1)<Math.abs(last-s2)?"S1":"S2"):(Math.abs(last-r1)<Math.abs(last-r2)?"R1":"R2");
 let bias=last>r1?"EXPANSION BULL":last<pivot&&last>s1?"SOFT BEAR":last<pivot?"BEAR PRESSURE":last>pivot&&last<r1?"SOFT BULL":"NEUTRAL";
 return {pivot,s1,s2,s3,r1,r2,r3,range:rng,breakAbove:r1*(1.0025),breakBelow:s1*(0.9975),nearest,bias}
}

function swingStructure(h,l,c,look=3){
 let highs=[],lows=[];for(let i=look;i<c.length-look;i++){let wh=h.slice(i-look,i+look+1),wl=l.slice(i-look,i+look+1);if(h[i]===Math.max(...wh))highs.push({i,v:h[i]});if(l[i]===Math.min(...wl))lows.push({i,v:l[i]})}
 let sh=highs.slice(-3),sl=lows.slice(-3),bos="NONE",choch="NONE";
 if(sh.length>=2&&c[c.length-1]>sh[sh.length-1].v)bos="BOS UP";if(sl.length>=2&&c[c.length-1]<sl[sl.length-1].v)bos="BOS DOWN";
 if(sh.length>=2&&sl.length>=2){let bull=sh[sh.length-1].v>sh[sh.length-2].v&&sl[sl.length-1].v>sl[sl.length-2].v,bear=sh[sh.length-1].v<sh[sh.length-2].v&&sl[sl.length-1].v<sl[sl.length-2].v;if(bull&&bos==="BOS DOWN")choch="CHOCH DOWN";if(bear&&bos==="BOS UP")choch="CHOCH UP"}
 return {highs:sh,lows:sl,bos,choch}
}

function candleDeltaProxy(j){
 const d=[],cvd=[];let acc=0;
 for(const x of j){let h=+x[2],l=+x[3],c=+x[4],v=+x[5],range=h-l,clv=range?Math.max(-1,Math.min(1,(2*c-h-l)/range)):0,delta=v*clv;d.push(delta);acc+=delta;cvd.push(acc)}
 let i=j.length-1,look=Math.min(20,i),pchg=+j[i][4]-+j[i-look][4],cchg=cvd[i]-cvd[i-look],div="NONE";
 if(pchg>0&&cchg<0)div="BEAR DIV";else if(pchg<0&&cchg>0)div="BULL DIV";
 if(volLipsaIn(j,i-look,i))return {delta:null,deltaPct:null,cvd:null,slope20:null,divergence:"N/A",series:[]};
 let vol=+j[i][5]||1;return {delta:d[i],deltaPct:d[i]/vol*100,cvd:cvd[i],slope20:cchg/Math.max(1,look),divergence:div,series:cvd.slice(-160)}
}
function keltnerState(h,l,c,n=20,mult=1.5){const mid=ema(c,n),atr=ATR(h,l,c,n),i=c.length-1;return {mid:mid[i],upper:mid[i]+mult*atr[i],lower:mid[i]-mult*atr[i],atr:atr[i]}}
function ttmSqueeze(h,l,c,n=20){
 const ma=sma(c,n),sd=stddev(c,n),kc=keltnerState(h,l,c,n,1.5),i=c.length-1,bbU=ma[i]+2*sd[i],bbL=ma[i]-2*sd[i],on=bbU<kc.upper&&bbL>kc.lower;
 const hh=Math.max(...h.slice(-n)),ll=Math.min(...l.slice(-n)),basis=((hh+ll)/2+ma[i])/2;
 return {state:on?"SQUEEZE ON":"SQUEEZE OFF",momentum:c[i]-basis,bbUpper:bbU,bbLower:bbL,kcUpper:kc.upper,kcLower:kc.lower}
}
function choppinessIndex(h,l,c,n=14){
 const i=c.length-1;if(i<n)return 50;let sum=0;
 for(let z=i-n+1;z<=i;z++){let tr=z===0?h[z]-l[z]:Math.max(h[z]-l[z],Math.abs(h[z]-c[z-1]),Math.abs(l[z]-c[z-1]));sum+=tr}
 let hh=Math.max(...h.slice(i-n+1,i+1)),ll=Math.min(...l.slice(i-n+1,i+1)),range=hh-ll;
 return range>0?100*Math.log10(sum/range)/Math.log10(n):50
}
function efficiencyRatio(c,n=20){let i=c.length-1;if(i<n)return 0;let change=Math.abs(c[i]-c[i-n]),noise=0;for(let z=i-n+1;z<=i;z++)noise+=Math.abs(c[z]-c[z-1]);return noise?change/noise:0}
function rsValue(arr){if(arr.length<5)return NaN;let mean=arr.reduce((a,b)=>a+b,0)/arr.length,cum=0,mn=Infinity,mx=-Infinity;for(const v of arr){cum+=v-mean;mn=Math.min(mn,cum);mx=Math.max(mx,cum)}let variance=arr.reduce((a,v)=>a+(v-mean)**2,0)/arr.length,sd=Math.sqrt(variance);return sd?((mx-mn)/sd):NaN}
function hurstExponent(c,maxN=80){
 let r=[];for(let i=1;i<c.length;i++)r.push(Math.log(c[i]/c[i-1]));const sizes=[10,20,40,80].filter(n=>n<=Math.min(maxN,r.length)),xs=[],ys=[];
 for(const n of sizes){let vals=[];for(let end=r.length;end>=n&&vals.length<5;end-=n){let v=rsValue(r.slice(end-n,end));if(Number.isFinite(v)&&v>0)vals.push(v)}if(vals.length){xs.push(Math.log(n));ys.push(Math.log(vals.reduce((a,b)=>a+b,0)/vals.length))}}
 if(xs.length<2)return .5;let mx=xs.reduce((a,b)=>a+b,0)/xs.length,my=ys.reduce((a,b)=>a+b,0)/ys.length,num=0,den=0;for(let i=0;i<xs.length;i++){num+=(xs[i]-mx)*(ys[i]-my);den+=(xs[i]-mx)**2}return den?Math.max(0,Math.min(1,num/den)):.5
}
function realizedVolatility(c,n=20){let r=[];for(let i=1;i<c.length;i++)r.push(Math.log(c[i]/c[i-1]));if(r.length<n)return 0;let a=r.slice(-n),m=a.reduce((x,y)=>x+y,0)/a.length,v=a.reduce((x,y)=>x+(y-m)**2,0)/a.length;return Math.sqrt(v*n)*100}
function rollingRvPercentile(c,n=20,look=160){let vals=[];for(let end=Math.max(n+1,c.length-look);end<=c.length;end++){let v=realizedVolatility(c.slice(0,end),n);if(Number.isFinite(v))vals.push(v)}let cur=vals[vals.length-1]||0;return {value:cur,percentile:pctRank(vals,cur)}}
function parkinsonVol(h,l,n=20){let a=[];for(let i=Math.max(0,h.length-n);i<h.length;i++){if(l[i]>0&&h[i]>0)a.push(Math.log(h[i]/l[i])**2)}return a.length?Math.sqrt(a.reduce((x,y)=>x+y,0)/(4*Math.log(2)*a.length)*n)*100:0}
function garmanKlassVol(j,n=20){let a=[];for(const x of j.slice(-n)){let o=+x[1],h=+x[2],l=+x[3],c=+x[4];if(o>0&&h>0&&l>0&&c>0)a.push(.5*Math.log(h/l)**2-(2*Math.log(2)-1)*Math.log(c/o)**2)}let v=a.length?a.reduce((x,y)=>x+y,0)/a.length:0;return Math.sqrt(Math.max(0,v)*n)*100}
function weightedVwapBand(j,n=50){const a=j.slice(-n);if(areVolLipsa(a))return {mid:null,sd:null,u1:null,l1:null,u2:null,l2:null};let sw=0,sp=0;for(const x of a){let p=(+x[2]+ +x[3]+ +x[4])/3,w=+x[5];sw+=w;sp+=p*w}let mid=sw?sp/sw:+a[a.length-1][4],varw=0;for(const x of a){let p=(+x[2]+ +x[3]+ +x[4])/3,w=+x[5];varw+=w*(p-mid)**2}let sd=sw?Math.sqrt(varw/sw):0;return {mid,sd,u1:mid+sd,l1:mid-sd,u2:mid+2*sd,l2:mid-2*sd}}
function periodStart(ts,type){const d=new Date(ts),y=d.getUTCFullYear(),m=d.getUTCMonth(),day=d.getUTCDate();if(type==="day")return Date.UTC(y,m,day);if(type==="month")return Date.UTC(y,m,1);let dow=(d.getUTCDay()+6)%7;return Date.UTC(y,m,day-dow)}
function calendarVwap(j,type){const start=periodStart(+j[j.length-1][0],type),a=j.filter(x=>+x[0]>=start);if(!a.length)return NaN;if(areVolLipsa(a))return null;let sw=0,sp=0;for(const x of a){let p=(+x[2]+ +x[3]+ +x[4])/3,w=+x[5];sw+=w;sp+=p*w}return sw?sp/sw:NaN}
function previousPeriodHL(j,type){const last=+j[j.length-1][0],cur=periodStart(last,type),prev=type==="day"?cur-86400000:cur-7*86400000,a=j.filter(x=>+x[0]>=prev&&+x[0]<cur);if(!a.length)return null;return {high:Math.max(...a.map(x=>+x[2])),low:Math.min(...a.map(x=>+x[3]))}}
function equalLiquidity(h,l,atrNow,look=60){const start=Math.max(0,h.length-look),tol=Math.max(atrNow*.15,1e-12);let eh=null,el=null;for(let i=h.length-1;i>=start;i--){for(let k=i-2;k>=start;k--){if(eh==null&&Math.abs(h[i]-h[k])<=tol)eh=(h[i]+h[k])/2;if(el==null&&Math.abs(l[i]-l[k])<=tol)el=(l[i]+l[k])/2;if(eh!=null&&el!=null)return {equalHigh:eh,equalLow:el}}}return {equalHigh:eh,equalLow:el}}
function fvgLifecycle(j,look=80){
 const start=Math.max(2,j.length-look),gaps=[];for(let i=start;i<j.length;i++){let h2=+j[i-2][2],l2=+j[i-2][3],h=+j[i][2],l=+j[i][3];if(l>h2)gaps.push({type:"BULL",low:h2,high:l,index:i,status:"ACTIVE"});else if(h<l2)gaps.push({type:"BEAR",low:h,high:l2,index:i,status:"ACTIVE"})}
 for(const g of gaps){let partial=false,mit=false;for(let z=g.index+1;z<j.length;z++){let hi=+j[z][2],lo=+j[z][3];if(g.type==="BULL"){if(lo<=g.low){mit=true;break}if(lo<g.high)partial=true}else{if(hi>=g.high){mit=true;break}if(hi>g.low)partial=true}}g.status=mit?"MITIGATED":partial?"PARTIAL":"ACTIVE"}
 return [...gaps].reverse().find(x=>x.status!=="MITIGATED")||gaps[gaps.length-1]||null
}
function liquidityMap(j,atrNow){const h=j.map(x=>+x[2]),l=j.map(x=>+x[3]),c=+j[j.length-1][4],pd=previousPeriodHL(j,"day"),pw=previousPeriodHL(j,"week"),eq=equalLiquidity(h,l,atrNow),hi=Math.max(...h.slice(-50)),lo=Math.min(...l.slice(-50)),mid=(hi+lo)/2;return {prevDay:pd,prevWeek:pw,equalHigh:eq.equalHigh,equalLow:eq.equalLow,premium:c>=mid?"PREMIUM":"DISCOUNT",mid,fvg:fvgLifecycle(j)}}
function regimeFusion(q){let trend=0,range=0,reasons=[];if(q.chop<38){trend+=2;reasons.push("low CHOP")}else if(q.chop>61){range+=2;reasons.push("high CHOP")}if(q.efficiency>=.45){trend+=2;reasons.push("efficient move")}else if(q.efficiency<.25){range+=1;reasons.push("low efficiency")}if(q.hurst>=.55){trend+=1;reasons.push("persistent Hurst")}else if(q.hurst<=.45){range+=1;reasons.push("mean-reverting Hurst")}if(q.adx>=25)trend+=1;else range+=1;let state=trend>=4?"TRENDING":range>=4?(q.hurst<=.45?"MEAN-REVERTING":"CHOPPY"):"TRANSITION",quality=Math.max(0,Math.min(100,50+(trend-range)*10));return {state,quality,reason:reasons.join(" · ")||"mixed regime evidence"}}
function calc(j,mode="auto"){
 let c=j.map(x=>+x[4]),lo=j.map(x=>+x[3]),hi=j.map(x=>+x[2]),v=j.map(x=>volBara(x)??0),i=c.length-1;
 // ferestrele exacte ale indicatorilor de volum (vezi rollingVWAP/MFI/CMF/OBV/vr mai jos)
 const lipsaVwap=volLipsaIn(j,i-49,i),lipsaMfi=volLipsaIn(j,i-13,i),lipsaCmf=volLipsaIn(j,i-19,i),lipsaVr=volLipsaIn(j,i-19,i),lipsaObv=volLipsaIn(j,i-19,i),lipsaSmc=volLipsaIn(j,i-20,i);
 let e20=ema(c,20),e50=ema(c,50),e200=ema(c,200),rr=RSI(c),m12=ema(c,12),m26=ema(c,26),m=m12.map((x,z)=>x-m26[z]),sig=ema(m,9),hist=m.map((x,z)=>x-sig[z]);
 let atr=ATR(hi,lo,c,14),dm=DMI(hi,lo,c,14),stoch=stochRSI(rr,14),ma20=sma(c,20),sd20=stddev(c,20),vwap=rollingVWAP(hi,lo,c,v,50),mfiArr=MFI(hi,lo,c,v,14),cmfArr=CMF(hi,lo,c,v,20),obvArr=OBV(c,v),ichi=ichimoku(hi,lo,c),divergence=rsiDivergence(c,rr),levels=levelLadder(hi,lo,c,50);
 let atrPct=atr[i]/c[i]*100,p=profileParams(mode,atrPct,dm.adx[i]),st=superTrend(hi,lo,c,atr,14,p.st),smc=smcState(hi,lo,c,v,!lipsaSmc),structure2=swingStructure(hi,lo,c,3);
 let deltaFlow=candleDeltaProxy(j),ttm=ttmSqueeze(hi,lo,c,20),chop=choppinessIndex(hi,lo,c,14),efficiency=efficiencyRatio(c,20),hurst=hurstExponent(c,80),rv=rollingRvPercentile(c,20,160),parkVol=parkinsonVol(hi,lo,20),gkVol=garmanKlassVol(j,20),vwapBands=weightedVwapBand(j,50),calendarVwaps={day:calendarVwap(j,"day"),week:calendarVwap(j,"week"),month:calendarVwap(j,"month")};
 let vm=v.slice(-20).reduce((a,b)=>a+b,0)/Math.min(20,v.length),vr=v[i]/(vm||1),roc10=(c[i]/c[Math.max(0,i-10)]-1)*100;
 let upper=ma20[i]+2*sd20[i],lower=ma20[i]-2*sd20[i],bbpos=(c[i]-lower)/Math.max(upper-lower,1e-12)*100;
 let dstart=Math.max(1,i-p.breakout),prevHi=Math.max(...hi.slice(dstart,i)),prevLo=Math.min(...lo.slice(dstart,i)),bo=c[i]>prevHi?"UP":c[i]<prevLo?"DOWN":"NONE";
 let trendScore=50;
 trendScore+=c[i]>e20[i]?9:-9;trendScore+=e20[i]>e50[i]?11:-11;trendScore+=e50[i]>e200[i]?13:-13;trendScore+=st.trend[i]>0?12:-12;trendScore+=dm.pdi[i]>dm.mdi[i]?5:-5;
 trendScore=Math.max(0,Math.min(100,trendScore));
 let momScore=50;momScore+=rr[i]>=55?10:rr[i]<=45?-10:0;momScore+=hist[i]>0?13:-13;momScore+=roc10>0?10:-10;momScore+=stoch[i]>55?7:stoch[i]<45?-7:0;momScore=Math.max(0,Math.min(100,momScore));
 let volScore=null;if(!lipsaVr&&!lipsaVwap){volScore=50;if(vr>=1.5)volScore+=c[i]>=c[i-1]?24:-24;else if(vr>=1.1)volScore+=c[i]>=c[i-1]?12:-12;if(c[i]>vwap[i])volScore+=8;else volScore-=8;volScore=Math.max(0,Math.min(100,volScore))}
 let structureScore=smc.score;if(bo==="UP")structureScore=Math.min(100,structureScore+12);if(bo==="DOWN")structureScore=Math.max(0,structureScore-12);
 let regime=dm.adx[i]>=25?(trendScore>=55?"TREND BULL":"TREND BEAR"):(atrPct>=3?"VOLATILE RANGE":"RANGE"),liquidity=liquidityMap(j,atr[i]);
 let w=mode==="scalp"?[.25,.32,.18,.25]:mode==="swing"?[.42,.20,.12,.26]:[.34,.27,.15,.24];
 if(mode==="auto"&&regime==="RANGE")w=[.22,.28,.20,.30];
 let score=volScore===null?(trendScore*w[0]+momScore*w[1]+structureScore*w[3])/(w[0]+w[1]+w[3]):trendScore*w[0]+momScore*w[1]+volScore*w[2]+structureScore*w[3];
 if(rr[i]>78)score-=5;if(rr[i]<22)score+=5;if(smc.trap&&bo==="UP")score-=7;if(smc.trap&&bo==="DOWN")score+=7;
 score=Math.max(0,Math.min(100,score));
 let threshold=p.signal,ver=score>=threshold?"BULLISH":score<=100-threshold?"BEARISH":"NEUTRAL",signal=score>=threshold+2?"LONG":score<=98-threshold?"SHORT":"WAIT";
 let confluence=Math.min(100,Math.abs(score-50)*2),quality=confluence>=78?"A":confluence>=62?"B":confluence>=46?"C":"D";
 return{
  price:c[i],score,signal,quality,confluence,regime,trendScore,momScore,volScore,structureScore,structure2,
  rsi:rr[i],stoch:stoch[i],mfi:lipsaMfi?null:mfiArr[i],cmf:lipsaCmf?null:cmfArr[i],obvSlope:lipsaObv?null:obvArr[i]-obvArr[Math.max(0,i-20)],ichimoku:ichi.state,divergence,vr:lipsaVr?null:vr,volumLipsa:areVolLipsa(j),ema:e20[i]>e50[i]&&e50[i]>e200[i],emaDir:e20[i]>e50[i]?"UP":"DOWN",macd:hist[i]>0,
  adx:dm.adx[i],pdi:dm.pdi[i],mdi:dm.mdi[i],supertrend:st.trend[i]>0?"BULL":"BEAR",bbpos,vwapAbove:lipsaVwap?null:c[i]>=vwap[i],levels,
  atr:atr[i],atrPct,e20Now:e20[i],e50Now:e50[i],e200Now:e200[i],sup:Math.min(...lo.slice(-50)),res:Math.max(...hi.slice(-50)),ver,breakout:bo,prevHi,prevLo,smc,
  deltaFlow,ttm,chop,efficiency,hurst,rv20:rv.value,rvPercentile:rv.percentile,parkVol,gkVol,vwapBands,calendarVwaps,liquidity,
  candles:j.slice(-160),closes:c.slice(-160),e20:e20.slice(-160),e50:e50.slice(-160)
 }
}
function marketStoreKey(base){return assetClass()==="STOCKS"?base+"Stocks":base}
function remember(s){let c=coin(s),key=marketStoreKey("recent"),a=JSON.parse(localStorage.getItem(key)||"[]");a=[c,...a.filter(x=>x!==c)].slice(0,8);localStorage.setItem(key,JSON.stringify(a));if(assetClass()==="STOCKS")localStorage.setItem("lastStock",c);else{localStorage.setItem("lastCrypto",c);localStorage.setItem("last",c)}renderLists()}
function favs(){const key=marketStoreKey("favs"),def=assetClass()==="STOCKS"?'["AAPL","MSFT","NVDA"]':'["BTC","ETH","SOL"]';return JSON.parse(localStorage.getItem(key)||def)}
function toggleFav(){let c=coin(norm($("symbol").value)),key=marketStoreKey("favs"),a=favs();a=a.includes(c)?a.filter(x=>x!==c):[c,...a].slice(0,15);localStorage.setItem(key,JSON.stringify(a));renderLists()}
function pick(c){$("symbol").value=c;if(assetClass()==="STOCKS")localStorage.setItem("lastStock",c);else localStorage.setItem("lastCrypto",c);show("dash");analyze(true)}
function renderLists(){let f=favs(),key=marketStoreKey("recent"),def=assetClass()==="STOCKS"?'["AAPL","MSFT","NVDA"]':'["BTC","ETH","SOL"]',r=JSON.parse(localStorage.getItem(key)||def);$("favorites").innerHTML=f.map(x=>`<button class="pill" data-action-click="pick(&#x27;${x}&#x27;)">★ ${x}</button>`).join("");$("recent").innerHTML=r.map(x=>`<button class="pill" data-action-click="pick(&#x27;${x}&#x27;)">${x}</button>`).join("");$("watchout").innerHTML=f.length?f.map(x=>`<div class="row"><b>${x}</b><button class="pill" data-action-click="pick(&#x27;${x}&#x27;)">Analiză</button></div>`).join(""):`<div class="emptyState">No favorites yet.</div>`}

let chartBars=100;
function setChartBars(n){chartBars=n;if(window.__radarState&&window.__radarState.q)draw(window.__radarState.q)}
function draw(q){
 let cv=$("chart"),ctx=cv.getContext("2d"),w=cv.width,h=cv.height,padL=48,padR=12,padT=12,volH=70,priceH=h-volH-28;
 let candles=q.candles.slice(-chartBars),cl=q.closes.slice(-chartBars),e20=q.e20.slice(-chartBars),e50=q.e50.slice(-chartBars);
 let highs=candles.map(x=>+x[2]),lows=candles.map(x=>+x[3]),vols=candles.map(x=>+x[5]),mn=Math.min(...lows),mx=Math.max(...highs),vrange=mx-mn||1,maxV=Math.max(...vols)||1;
 let x=i=>padL+(i+.5)*(w-padL-padR)/candles.length,y=v=>padT+(mx-v)/vrange*(priceH-padT),vw=Math.max(2,(w-padL-padR)/candles.length*.58);
 ctx.clearRect(0,0,w,h);ctx.fillStyle="#09121b";ctx.fillRect(0,0,w,h);
 ctx.strokeStyle="#172638";ctx.lineWidth=1;ctx.fillStyle="#718198";ctx.font="10px system-ui";
 for(let k=0;k<5;k++){let yy=padT+k*(priceH-padT)/4,val=mx-k*vrange/4;ctx.beginPath();ctx.moveTo(padL,yy);ctx.lineTo(w-padR,yy);ctx.stroke();ctx.fillText(num(val),4,yy+3)}
 if(q.levels){
   const zone=(a,b,color)=>{let ya=y(Math.max(a,b)),yb=y(Math.min(a,b));ctx.fillStyle=color;ctx.fillRect(padL,ya,w-padL-padR,Math.max(2,yb-ya))};
   zone(q.levels.s2,q.levels.s1,"rgba(85,216,155,.08)");
   zone(q.levels.r1,q.levels.r2,"rgba(255,107,120,.08)");
   zone(q.levels.pivot-q.levels.range*.035,q.levels.pivot+q.levels.range*.035,"rgba(105,167,255,.07)");
 }
 candles.forEach((c,i)=>{let o=+c[1],hi=+c[2],lo=+c[3],cc=+c[4],bull=cc>=o,col=bull?"#55d89b":"#ff6b78";ctx.strokeStyle=col;ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(x(i),y(hi));ctx.lineTo(x(i),y(lo));ctx.stroke();let top=Math.min(y(o),y(cc)),bh=Math.max(1,Math.abs(y(o)-y(cc)));ctx.fillRect(x(i)-vw/2,top,vw,bh);let vh=(+c[5])/maxV*(volH-12);ctx.globalAlpha=.35;ctx.fillRect(x(i)-vw/2,h-8-vh,vw,vh);ctx.globalAlpha=1});
 function line(a,col,width){ctx.strokeStyle=col;ctx.lineWidth=width;ctx.beginPath();a.forEach((v,i)=>{let xx=x(i),yy=y(v);i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy)});ctx.stroke()}
 line(e50,"#7f8da3",1);line(e20,"#4fd1c5",1.35);
 ctx.setLineDash([4,4]);ctx.strokeStyle="#385067";ctx.beginPath();ctx.moveTo(padL,y(q.sup));ctx.lineTo(w-padR,y(q.sup));ctx.stroke();ctx.beginPath();ctx.moveTo(padL,y(q.res));ctx.lineTo(w-padR,y(q.res));ctx.stroke();ctx.setLineDash([]);
}
function historicalProbability(j,horizon=4){
  const c=j.map(x=>+x[4]), v=j.map(x=>+x[5]), n=c.length;
  if(n<260)return null;
  const e20=ema(c,20), e50=ema(c,50), e200=ema(c,200), rr=RSI(c);
  const m12=ema(c,12), m26=ema(c,26), mac=m12.map((x,i)=>x-m26[i]), sig=ema(mac,9);
  let feat=(i)=>{
    if(i<205)return null;
    let a=Math.max(0,i-19), vm=0; for(let z=a;z<=i;z++)vm+=v[z]; vm/=Math.max(1,i-a+1);
    return [(c[i]/e20[i]-1)*100,(e20[i]/e50[i]-1)*100,(e50[i]/e200[i]-1)*100,(rr[i]-50)/10,(mac[i]-sig[i])/(c[i]||1)*10000,Math.log(Math.max(v[i]/(vm||1),.05))];
  };
  const cur=feat(n-1); if(!cur)return null;
  if(areVolLipsa(j)){cur[5]=0;const f0=feat;feat=(i)=>{const f=f0(i);if(f)f[5]=0;return f}}
  let samples=[], scales=[1.2,1,1,1,1,.8];
  for(let i=205;i<n-horizon-2;i+=2){
    let f=feat(i), d=0;
    for(let k=0;k<f.length;k++)d+=Math.pow((f[k]-cur[k])/scales[k],2);
    samples.push({dist:Math.sqrt(d),ret:(c[i+horizon]/c[i]-1)*100});
  }
  if(!samples.length)return null;
  samples.sort((a,b)=>a.dist-b.dist);
  let k=Math.min(60,Math.max(20,Math.floor(samples.length*.12))), near=samples.slice(0,k), ws=0, upw=0, av=0;
  near.forEach(x=>{let w=1/(.25+x.dist);ws+=w;if(x.ret>0)upw+=w;av+=x.ret*w});
  let up=upw/ws*100, down=100-up, avg=av/ws, strength=Math.abs(up-50)*2;
  // v74.6: banda de zgomot. Masurat: pe mers ALEATOR kNN-ul ghiceste directia
  // in 48,8% din cazuri - deci procentul, singur, nu dovedeste nimic. Banda e
  // intervalul binomial 95% in jurul lui 50%, pe numarul EFECTIV de analogi
  // (ponderile inegale il micsoreaza). Cat e in banda: NEUTRAL, fara culoare.
  let w2=0;near.forEach(x=>{let w=1/(.25+x.dist);w2+=w*w});
  const nEff=w2?ws*ws/w2:k,banda=1.96*Math.sqrt(.25/Math.max(1,nEff))*100,inBanda=Math.abs(up-50)<=banda;
  return {up,down,avg,k,strength,banda,nEff,inBanda,nedovedit:true,ver:inBanda?"NEUTRAL":up>=58?"BULLISH":up<=42?"BEARISH":"NEUTRAL"};
}
// Eticheta afisata pentru kNN: procentul, banda si "nedovedit" - niciodata singur.
function knnEticheta(hp){
  if(!hp||!Number.isFinite(+hp.up))return {text:"Hist —",cls:"neutral"};
  const b=Number.isFinite(+hp.banda)?+hp.banda:null,inBanda=b===null||Math.abs(hp.up-50)<=b;
  return {text:`Hist ↑ ${(+hp.up).toFixed(0)}%${b!==null?" ±"+b.toFixed(0):""} · nedovedit`,cls:inBanda?"neutral":cls(hp.ver)}
}
// v74.6: bara in FORMARE (deschisa acum, inca se misca) nu intra in semnale:
// un semnal calculat pe ea se schimba pana la inchidere si jurnalul automat il
// retinea ca si cum ar fi fost final. Pretul viu ramane doar pentru afisare.
// Runda 1: la actiuni pe 1d, functions/api/stocks.js (nyCloseUtcMs) pune pe
// bara ora INCHIDERII bursei (20:00/21:00 UTC), nu a deschiderii - acolo bara e
// in formare doar daca ora ei e inca in viitor. Restul surselor (Binance,
// Pionex, actiuni intraday) poarta ora de DESCHIDERE: in formare = t + interval > acum.
function bareInchise(j,tf,acum=Date.now(),sursa=null){
  if(!Array.isArray(j)||!j.length)return j||[];
  const ms=tfMinutes(tf)*60000,t=+j[j.length-1][0];
  if(!Number.isFinite(t))return j;
  const inFormare=sursa==="TWELVEDATA"&&tf==="1d"?t>acum:t+ms>acum;
  return inFormare?j.slice(0,-1):j
}
// Runda 1 (regula controlorului): volumul LIPSA (null de la serverul de actiuni)
// nu mai e 0. O lumanare fara volum in fereastra unui indicator de volum face
// indicatorul null ("—"), iar volScore null iese din scor (ponderea lui se scoate
// din numitor). Cu volum complet (cripto) totul ramane exact ca inainte.
function volBara(x){const v=x&&x[5];if(v==null||v==="")return null;const n=+v;return Number.isFinite(n)?n:null}
function volLipsaIn(j,de,pana){if(!Array.isArray(j))return false;for(let k=Math.max(0,de);k<=Math.min(j.length-1,pana);k++)if(volBara(j[k])===null)return true;return false}
function areVolLipsa(rows){return volLipsaIn(rows,0,(rows||[]).length-1)}
function numSau(x){return x==null||!Number.isFinite(+x)?"—":num(x)}
function historicalSet(j){return {h1:historicalProbability(j,1),h4:historicalProbability(j,4),h12:historicalProbability(j,12)}}

async function loadFearGreed(){
 try{
  const r=await fetch("https://api.alternative.me/fng/?limit=1&format=json",{cache:"no-store"});
  const j=await r.json(),d=j&&j.data&&j.data[0];if(!d)return;
  const v=Math.max(0,Math.min(100,+d.value||50));markFresh("sentiment");$("fearGreed").textContent=`${v} · ${d.value_classification||""}`;$("sentimentNeedle").style.left=`calc(${v}% - 1px)`;$("sentimentText").textContent=`Fear & Greed extern: ${d.value_classification||"N/A"} · nu modifică direct scorul tehnic.`;
 }catch{$("fearGreed").textContent="N/A";$("sentimentText").textContent="Sentiment extern indisponibil; engine-ul tehnic continuă normal."}
}
async function mtfData(s,src=analysisSource()){
 return analysisMtfData(s,src)
}
function mtfComposite(m){
 const weights={"15m":.15,"1h":.25,"4h":.35,"1d":.25},expected=Number(m?.expected)||4,coverage=clamp((m?.coverage??((m?.length||0)/expected))*100,0,100)/100;let sum=0,ws=0;
 for(const x of m||[]){let w=weights[x.tf]||.25;sum+=x.score*w;ws+=w}
 const rawAvg=ws?sum/ws:50,bull=(m||[]).filter(x=>x.ver==="BULLISH").length,bear=(m||[]).filter(x=>x.ver==="BEARISH").length,neutral=(m||[]).length-bull-bear,minCoverage=3/4;
 let avg=50+(rawAvg-50)*coverage*coverage,comp="NEUTRAL";
 if(coverage>=minCoverage)comp=bull>=3?"BULLISH":bear>=3?"BEARISH":avg>=61?"BULLISH":avg<=39?"BEARISH":"NEUTRAL";
 const agreement=(m||[]).length?Math.max(bull,bear,neutral)/(m.length):0,confidence=Math.round(agreement*coverage*100);
 return {avg,rawAvg,bull,bear,neutral,comp,confidence,coverage,coveragePct:Math.round(coverage*100),available:(m||[]).length,expected,missing:m?.missing||[],usable:coverage>=minCoverage}
}

function signalModel(q,hs,mc){
  // v74.6: kNN are pondere 0 in scor (nedovedit: 48,8% directie pe mers aleator).
  // Se pune 50 = neutru, ca pragurile si scala scorului sa ramana aceleasi.
  const histUp=50,histDown=50;
  // volScore null (volum lipsa): ponderea lui (0.06) iese din numitor
  const faraVol=q.volScore==null,numitor=faraVol?.94:1;
  let long=(0.42*q.score+0.22*histUp+0.20*mc.avg+0.10*q.structureScore+(faraVol?0:0.06*q.volScore))/numitor;
  let short=(0.42*(100-q.score)+0.22*histDown+0.20*(100-mc.avg)+0.10*(100-q.structureScore)+(faraVol?0:0.06*(100-q.volScore)))/numitor;
  if(q.divergence==="BULL DIV")long+=4;
  if(q.divergence==="BEAR DIV")short+=4;
  if(q.ichimoku==="BULL")long+=3;
  if(q.ichimoku==="BEAR")short+=3;
  if(q.smc.trap&&q.breakout==="UP")long-=5;
  if(q.smc.trap&&q.breakout==="DOWN")short-=5;
  long=Math.max(0,Math.min(100,long));short=Math.max(0,Math.min(100,short));
  const edge=Math.abs(long-short),best=Math.max(long,short);
  let minConf=(typeof appSettings==="function"?appSettings().signalMin:64);let direction=best>=minConf&&edge>=8?(long>short?"LONG":"SHORT"):"WAIT";
  return {long,short,edge,direction}
}
function buildTradeMap(q,sm){
  let dir=sm.direction,entryLow=q.price,entryHigh=q.price,stop=q.price,tp1=q.price,tp2=q.price,tp3=q.price,risk=0;
  if(dir==="LONG"){
    entryLow=Math.max(q.sup,q.price-q.atr*.35);entryHigh=q.price+q.atr*.10;
    stop=Math.min(entryLow-q.atr*.20,q.price-q.atr*1.6);risk=Math.max(.00000001,((entryLow+entryHigh)/2)-stop);
    let e=(entryLow+entryHigh)/2;tp1=e+risk;tp2=e+risk*1.8;tp3=e+risk*2.8;
  }else if(dir==="SHORT"){
    entryLow=q.price-q.atr*.10;entryHigh=Math.min(q.res,q.price+q.atr*.35);
    stop=Math.max(entryHigh+q.atr*.20,q.price+q.atr*1.6);risk=Math.max(.00000001,stop-((entryLow+entryHigh)/2));
    let e=(entryLow+entryHigh)/2;tp1=e-risk;tp2=e-risk*1.8;tp3=e-risk*2.8;
  }
  return {direction:dir,entryLow,entryHigh,stop,tp1,tp2,tp3,risk,rr1:dir==="WAIT"?0:1,rr2:dir==="WAIT"?0:1.8,rr3:dir==="WAIT"?0:2.8}
}
function updateSignalUI(q,hs,mc){
  const sm=signalModel(q,hs,mc),tm=buildTradeMap(q,sm);
  window.__signalState={sm,tm,q,hs,mc};
  $("longConf").textContent=sm.long.toFixed(0)+"/100";$("shortConf").textContent=sm.short.toFixed(0)+"/100";
  $("longBar").style.width=sm.long+"%";$("shortBar").style.width=sm.short+"%";
  $("longWhy").textContent=`Trend ${q.trendScore.toFixed(0)} · hist ↑ ${(hs.h4?hs.h4.up:50).toFixed(0)} (pondere 0, nedovedit) · MTF ${mc.avg.toFixed(0)} · SMC ${q.structureScore.toFixed(0)}`;
  $("shortWhy").textContent=`Trend ${(100-q.trendScore).toFixed(0)} · hist ↓ ${(hs.h4?hs.h4.down:50).toFixed(0)} (pondere 0, nedovedit) · MTF ${(100-mc.avg).toFixed(0)} · SMC ${(100-q.structureScore).toFixed(0)}`;
  $("tradeDecision").textContent=tm.direction;$("tradeDecision").className="value "+(tm.direction==="LONG"?"good":tm.direction==="SHORT"?"bad":"neutral");
  for(const [id,val] of [["entryLow",tm.entryLow],["entryHigh",tm.entryHigh],["signalStop",tm.stop],["tp1",tm.tp1]])$(id).textContent=tm.direction==="WAIT"?"—":num(val);
  $("tp23").textContent=tm.direction==="WAIT"?"—":`${num(tm.tp2)} / ${num(tm.tp3)}`;
  $("rr1").textContent=tm.direction==="WAIT"?"—":"1 : 1.0";$("rr2").textContent=tm.direction==="WAIT"?"—":"1 : 1.8";$("rr3").textContent=tm.direction==="WAIT"?"—":"1 : 2.8";
  return {sm,tm}
}
let researchJournalArchive=[],paperTradeArchive=[],researchArchiveReady=false;
function mergeById(rows){const m=new Map();for(const x of rows||[]){if(!x)continue;const id=String(x.id??`${x.ts||x.created||0}|${x.symbol||""}|${x.tf||""}|${x.direction||""}`);const prev=m.get(id);if(!prev||(+x.updated_ts||+x.updatedTs||+x.ts||0)>=(+prev.updated_ts||+prev.updatedTs||+prev.ts||0))m.set(id,x)}return [...m.values()].sort((a,b)=>(+b.ts||+b.created||0)-(+a.ts||+a.created||0))}
function journal(){try{return JSON.parse(localStorage.getItem("signalJournal")||"[]")}catch{return []}}
function researchJournalRows(){return mergeById([...researchJournalArchive,...journal()])}
function setJournal(a){researchJournalArchive=mergeById([...a,...researchJournalArchive]);if(!appSettings().privacySessionOnly){archiveSignalRows(a).catch(()=>{});localStorage.setItem("signalJournal",JSON.stringify(a.slice(0,250)))}}
async function hydrateResearchArchives(){
  if(!localDbSupported()){researchJournalArchive=journal();paperTradeArchive=paperTradesLocal();researchArchiveReady=true;return false}
  const [sig,pap]=await Promise.all([localDbRecords("signals",0,50000),localDbRecords("paper",0,50000)]);researchJournalArchive=mergeById([...sig.map(x=>x.data),...journal()]);paperTradeArchive=mergeById([...pap.map(x=>x.data),...paperTradesLocal()]);researchArchiveReady=true;renderSignals();renderPaper();renderAnalytics();renderProfitReadiness(false);return true
}
function signalOutcomeHorizonBars(mode){return mode==="scalp"?4:mode==="swing"?12:6}
function buildSignalRecord(st,ss,opt={}){
  const now=Date.now(),e=(ss.tm.entryLow+ss.tm.entryHigh)/2,horizon=signalOutcomeHorizonBars(st.mode),barMs=tfMinutes(st.tf)*60000,micro=decisionStateMatches(window.__microState,{source:false,maxAge:5*60*1000})?window.__microState:null,ctx=decisionStateMatches(window.__intelContext,{source:false,maxAge:10*60*1000})?window.__intelContext:null,news=decisionStateMatches(window.__intelNews,{source:false,maxAge:10*60*1000})?window.__intelNews:null,lastBar=+st.j?.at(-1)?.[0]||now;
  return {
    id:opt.id||String(now)+"-"+Math.random().toString(36).slice(2,7),ts:now,symbol:st.symbol,market:assetClass(),tf:st.tf,mode:st.mode,source:st.source||analysisSource(),origin:opt.origin||"USER_SAVED",hidden:!!opt.hidden,userSaved:!!opt.userSaved,
    direction:ss.tm.direction,entry:e,entryLow:ss.tm.entryLow,entryHigh:ss.tm.entryHigh,stop:ss.tm.stop,tp1:ss.tm.tp1,tp2:ss.tm.tp2,tp3:ss.tm.tp3,
    longConf:ss.sm.long,shortConf:ss.sm.short,regime:ss.q.regime,status:"NEW",lifecycle:"NEW",bestTarget:0,rResult:null,grossR:null,netR:null,entryActivated:false,
    feeBps:appSettings().feeBps,slippageBps:appSettings().slippageBps,executionPolicy:appSettings().executionPolicy,entryExpiryBars:appSettings().entryExpiryBars,forwardCohortStart:Number(localStorage.getItem("forwardValidationStart")||0),
    trendScore:ss.q.trendScore,momScore:ss.q.momScore,volScore:ss.q.volScore,structureScore:ss.q.structureScore,adx:ss.q.adx,atrPct:ss.q.atrPct,mfi:ss.q.mfi,cmf:ss.q.cmf,
    histUp:ss.hs.h4?ss.hs.h4.up:null,mtf:ss.mc.avg,mtfCoverage:ss.mc.coverage??null,
    microScore:micro?.composite?.score??null,microBias:micro?.composite?.bias??null,microDeltaPct:micro?.flow?.deltaPct??null,microImbalance:micro?.depth?.imb10??null,
    session:(window.__structureV38&&st.j?.length)?sessionForTs(lastBar):null,sweepScore:window.__structureV38?.sweep?.score??null,sweepType:window.__structureV38?.sweep?.type??null,nearestFvgStatus:window.__structureV38?.nearestFvg?.status??null,nearestFvgType:window.__structureV38?.nearestFvg?.type??null,premiumDiscount:window.__structureV38?.premiumDiscount?.zone??null,frictionBps:window.__structureV38?.friction?.roundTripBps??null,
    contextScore:ctx?contextScoreFrom(ctx.global,ctx.macro):null,newsRisk:news?.risk??null,newsHigh:news?.high??null,liqLong5:assetClass()==="CRYPTO"?liqStats().long5:null,liqShort5:assetClass()==="CRYPTO"?liqStats().short5:null,
    masterVerdict:window.__masterVerdict?.verdict||null,masterScore:Number.isFinite(+window.__masterVerdict?.score)?+window.__masterVerdict.score:null,dataQuality:Number.isFinite(+window.__masterVerdict?.quality)?+window.__masterVerdict.quality:null,
    breadthState:window.__marketBreadthV64?.state||null,breadthScore:Number.isFinite(+window.__marketBreadthV64?.score)?+window.__marketBreadthV64.score:null,breadthDivergence:window.__marketBreadthV64?.divergence||null,breadthCoverage:Number.isFinite(+window.__marketBreadthV64?.coverage)?+window.__marketBreadthV64.coverage:null,breadthAlignment:v64BreadthAlignment(ss.tm.direction),
    decisionOsState:window.__decisionIntelV65?.summary?.state||null,decisionOsScore:Number.isFinite(+window.__decisionIntelV65?.summary?.quality)?+window.__decisionIntelV65.summary.quality:null,killSwitch:window.__decisionIntelV65?.killSwitch?.state||null,entryEngine:window.__decisionIntelV65?.entry?.state||null,eventRiskV65:window.__decisionIntelV65?.eventRisk?.state||null,conflictStateV65:window.__decisionIntelV65?.conflict?.state||null,
    validationV66:typeof v66SignalSnapshot==="function"?v66SignalSnapshot():null,v66DnaKey:typeof v66DnaKey==="function"?v66DnaKey(v66CurrentDnaRow()):null,
    outcomeStartTs:lastBar,outcomeEndTsExpected:lastBar+horizon*barMs,outcomeHorizonBars:horizon,labelKnownAtCreate:false
  }
}
function researchCohortKey(st){const candle=+st.j?.at(-1)?.[0]||Math.floor(Date.now()/60000)*60000;return `${assetClass()}|${st.source||analysisSource()}|${st.symbol}|${st.tf}|${st.mode}|${candle}`}
function autoLogResearchSetup(){
  const st=window.__radarState,ss=window.__signalState;if(!st||!ss)return false;const key=researchCohortKey(st),base={id:key,ts:Date.now(),market:assetClass(),source:st.source||analysisSource(),symbol:st.symbol,tf:st.tf,mode:st.mode,direction:ss.tm.direction,score:ss.q.score,longConf:ss.sm.long,shortConf:ss.sm.short,regime:ss.q.regime,mtf:ss.mc.avg,mtfCoverage:ss.mc.coverage??null,outcomeStartTs:+st.j?.at(-1)?.[0]||Date.now(),outcomeEndTsExpected:(+st.j?.at(-1)?.[0]||Date.now())+signalOutcomeHorizonBars(st.mode)*tfMinutes(st.tf)*60000,prospective:true};
  localDbPutRecord("research_cohort",key,base,base.ts).catch(()=>{});if(ss.tm.direction==="WAIT")return true;
  const exists=researchJournalRows().some(x=>x.researchKey===key);if(exists)return true;let a=journal(),row=buildSignalRecord(st,ss,{origin:"AUTO_RESEARCH",hidden:true,userSaved:false});row.researchKey=key;a.unshift(row);setJournal(a);persistSignalHistory(row).catch(()=>{});return true
}
function saveSignal(){
  const st=window.__radarState,ss=window.__signalState;if(!st||!ss){alert("Rulează mai întâi Analizează.");return}if(ss.tm.direction==="WAIT"){alert("Semnalul curent este WAIT; cohorta de research este deja înregistrată automat.");return}
  const key=researchCohortKey(st),a=journal(),idx=a.findIndex(x=>x.researchKey===key||((x.symbol===st.symbol&&x.tf===st.tf&&x.direction===ss.tm.direction&&(x.source||"BINANCE")===(st.source||analysisSource())&&Date.now()-x.ts<15*60*1000)));
  if(idx>=0){a[idx]={...a[idx],hidden:false,userSaved:true,origin:a[idx].origin==="AUTO_RESEARCH"?"AUTO+USER":a[idx].origin||"USER_SAVED"};setJournal(a);renderSignals();persistSignalHistory(a[idx]).catch(()=>{});toast("Semnal marcat ca favorit/user-saved; cohorta prospectivă nu a fost duplicată.","good");return}
  const row=buildSignalRecord(st,ss,{origin:"USER_SAVED",hidden:false,userSaved:true});row.researchKey=key;a.unshift(row);setJournal(a);renderSignals();persistSignalHistory(row).catch(()=>{});persistEventHistory("SIGNAL_CREATED","Signal created",`${coin(st.symbol)} ${ss.tm.direction} · ${st.tf}`,{signalId:row.id,confidence:Math.max(ss.sm.long,ss.sm.short)}).catch(()=>{});toast("Semnal salvat în jurnal","good")
}
async function evaluateResearchJournalSilent(limit=12){
  let a=journal(),todo=a.map((x,i)=>({x,i})).filter(z=>!Number.isFinite(z.x.netR)&&z.x.status!=="OUT_OF_RANGE"&&z.x.status!=="AMBIGUOUS"&&Date.now()-(+z.x.ts||0)>tfMinutes(z.x.tf||"1h")*60000).slice(0,limit);if(!todo.length)return 0;let changed=0;for(const z of todo){try{const v=await evaluateOneSignal(z.x);if(v!==z.x||Number.isFinite(v.netR)){a[z.i]=v;changed++}}catch{}}if(changed){setJournal(a);renderSignals()}return changed
}

function signalStatusClass(st){return st==="STOP"||st==="AMBIGUOUS"||st==="OUT_OF_RANGE"?"bad":st&&st.includes("TP")?"good":"neutral"}
function metricR(x){return Number.isFinite(x.netR)?x.netR:Number.isFinite(x.rResult)?x.rResult:null}
function renderSignals(){
  const a=journal(),visible=a.filter(x=>!x.hidden||x.userSaved),box=$("journalOut");if(!box)return;
  box.innerHTML=visible.length?visible.slice(0,80).map(x=>`<div class="journalRow"><b>${coin(x.symbol)} <small>${x.source||"BINANCE"}</small></b><span class="tag ${x.direction==="LONG"?"tagLong":"tagShort"}">${x.direction}</span><span>${num(x.entry)}</span><b class="${signalStatusClass(x.status)}">${x.status}</b><span>${Math.max(x.longConf,x.shortConf).toFixed(0)}</span><span>${new Date(x.ts).toLocaleDateString()}</span></div>`).join(""):`<div class="row"><span>Nu ai semnale salvate.</span></div>`;
  renderPerformance();renderValidation()
}
function renderPerformance(){
  const a=journal(),src=analysisSource(),r=a.filter(x=>(x.source||"BINANCE")===src).map(x=>({...x,_r:metricR(x)})).filter(x=>Number.isFinite(x._r)),n=r.length,w=r.filter(x=>x._r>0).length,sum=r.reduce((z,x)=>z+x._r,0),gp=r.filter(x=>x._r>0).reduce((z,x)=>z+x._r,0),gl=-r.filter(x=>x._r<0).reduce((z,x)=>z+x._r,0);
  $("perfResolved").textContent=n;$("perfWin").textContent=n?(w/n*100).toFixed(1)+"%":"—";$("perfR").textContent=n?(sum/n).toFixed(2)+" R":"—";$("perfPF").textContent=n?(gl?(gp/gl).toFixed(2):gp?"∞":"0"):"—";
 const modes=["auto","scalp","intraday","swing"],box=$("strategyPerformance");if(box){box.innerHTML=modes.map(m=>{let z=r.filter(x=>x.mode===m),avg=z.length?z.reduce((a,x)=>a+x._r,0)/z.length:0,wr=z.length?z.filter(x=>x._r>0).length/z.length*100:0;return `<div class="calBox"><span class="label">${m}</span><b>${z.length?avg.toFixed(2)+"R":"—"}</b><span class="small">${z.length?wr.toFixed(0)+"% win · "+z.length+" n":"No data"}</span></div>`}).join("")}
}
function executionConfig(sig){
 const x=appSettings();return {feeBps:Number.isFinite(+sig.feeBps)?+sig.feeBps:+x.feeBps||10,slippageBps:Number.isFinite(+sig.slippageBps)?+sig.slippageBps:+x.slippageBps||3,policy:sig.executionPolicy||x.executionPolicy||"staged",expiryBars:Number.isFinite(+sig.entryExpiryBars)?+sig.entryExpiryBars:+x.entryExpiryBars||12}
}
function costInR(sig,cfg){
 const entry=+sig.entry||((+sig.entryLow + +sig.entryHigh)/2),risk=Math.abs(entry-(+sig.stop)),riskFrac=entry?risk/entry:0,roundTrip=2*(cfg.feeBps+cfg.slippageBps)/10000;
 return riskFrac>0?roundTrip/riskFrac:0
}
function finalizeSignal(sig,gross,status,lifecycle,cfg){
 sig.grossR=gross;sig.costR=costInR(sig,cfg);sig.netR=gross-sig.costR;sig.rResult=sig.netR;sig.status=status;sig.lifecycle=lifecycle;sig.resolved=true;return sig
}
function evaluateSignalBars(signal,bars){
 let sig={...signal},cfg=executionConfig(sig);if(!bars||!bars.length)return sig;
 const firstOpen=+bars[0][0];if(firstOpen>sig.ts){sig.status="OUT_OF_RANGE";sig.lifecycle="INVALIDATED";sig.historyUnavailable=true;return sig}
 const after=bars.filter(x=>+x[0]>sig.ts);if(!after.length){sig.status=sig.entryActivated?"ENTRY":"WAITING_ENTRY";sig.lifecycle=sig.status;return sig}
 let active=!!sig.entryActivated,best=Number(sig.bestTarget||0);
 const loEntry=Math.min(+sig.entryLow,+sig.entryHigh),hiEntry=Math.max(+sig.entryLow,+sig.entryHigh),entry=+sig.entry||((loEntry+hiEntry)/2);
 for(let bi=0;bi<after.length;bi++){
   const b=after[bi],hi=+b[2],lo=+b[3],open=+b[1];
   const touchesEntry=hi>=loEntry&&lo<=hiEntry;
   const stop0=sig.direction==="LONG"?lo<=+sig.stop:hi>=+sig.stop;
   const t1=sig.direction==="LONG"?hi>=+sig.tp1:lo<=+sig.tp1;
   const t2=sig.direction==="LONG"?hi>=+sig.tp2:lo<=+sig.tp2;
   const t3=sig.direction==="LONG"?hi>=+sig.tp3:lo<=+sig.tp3;
   if(!active){
     if(!touchesEntry){
       if(bi>=cfg.expiryBars-1){sig.status="EXPIRED_ENTRY";sig.lifecycle="INVALIDATED";sig.expiredAfterBars=cfg.expiryBars;return sig}
       continue
     }
     active=true;sig.entryActivated=true;sig.activationTs=+b[0];sig.fillPrice=Math.max(loEntry,Math.min(hiEntry,open));
     if(stop0||t1||t2||t3){sig.status="AMBIGUOUS";sig.lifecycle="INVALIDATED";sig.ambiguousReason="entry_and_exit_same_candle";return sig}
     sig.status="ENTRY";sig.lifecycle="ENTRY";continue
   }
   if(cfg.policy==="tp1full"){
     if(stop0&&t1){sig.status="AMBIGUOUS";sig.lifecycle="INVALIDATED";sig.ambiguousReason="stop_and_target_same_candle";return sig}
     if(t1)return finalizeSignal(sig,1,"TP1 · CLOSED","TP1",cfg);
     if(stop0)return finalizeSignal(sig,-1,"STOP","STOP",cfg);
     continue
   }
   const dynamicStop=best>=2?+sig.tp1:best>=1?entry:+sig.stop;
   const stopHit=sig.direction==="LONG"?lo<=dynamicStop:hi>=dynamicStop;
   const newBest=t3?3:t2?Math.max(best,2):t1?Math.max(best,1):best;
   if(stopHit&&newBest>best){sig.status="AMBIGUOUS";sig.lifecycle="INVALIDATED";sig.ambiguousReason="managed_stop_and_target_same_candle";return sig}
   best=newBest;sig.bestTarget=best;
   if(best>=3)return finalizeSignal(sig,1.73,"TP3 · STAGED CLOSED","TP3",cfg);
   if(stopHit){
     if(best>=2)return finalizeSignal(sig,1.28,"TP2 + TP1 STOP · CLOSED","TP2",cfg);
     if(best>=1)return finalizeSignal(sig,.40,"TP1 + BE · CLOSED","TP1",cfg);
     return finalizeSignal(sig,-1,"STOP","STOP",cfg)
   }
 }
 sig.bestTarget=best;sig.status=!active?"WAITING_ENTRY":best>=2?"OPEN · TP2":best>=1?"OPEN · TP1":"ENTRY";sig.lifecycle=!active?"WAITING_ENTRY":best>=2?"TP2":best>=1?"TP1":"ENTRY";return sig
}
async function evaluateOneSignal(sig){
  const src=sig.source||"BINANCE";
  let bars;try{bars=await analysisKlines(sig.symbol,sig.tf,750,src)}catch{return sig}
  return evaluateSignalBars(sig,bars)
}
async function evaluateJournal(){
  let a=journal();if(!a.length){renderSignals();return}
  $("journalOut").innerHTML='<div class="row"><span>Evaluez entry activation + cost model…</span></div>';
  for(let i=0;i<a.length;i++){
    if(a[i].status==="OUT_OF_RANGE"||a[i].status==="AMBIGUOUS")continue;
    if(Number.isFinite(a[i].netR))continue;
    a[i]=await evaluateOneSignal(a[i])
  }
  setJournal(a);v60AutoReviewResolved();renderSignals();renderTradeReviews();Promise.all(a.slice(0,80).map(x=>persistSignalHistory(x))).catch(()=>{});toast("Journal evaluated with cost-aware execution model","good")
}
function exportJournal(){
  const a=journal();if(!a.length){alert("Jurnalul este gol.");return}
  const cols=["date","market","symbol","source","tf","mode","direction","entry","entryActivated","activationTs","stop","tp1","tp2","tp3","longConf","shortConf","status","grossR","costR","netR","feeBps","slippageBps","executionPolicy","trendScore","momScore","volScore","structureScore","adx","atrPct","histUp","mtf","session","sweepScore","sweepType","nearestFvgStatus","nearestFvgType","premiumDiscount","frictionBps","contextScore","newsRisk","newsHigh","liqLong5","liqShort5"];
  const rows=[cols.join(",")].concat(a.map(x=>[new Date(x.ts).toISOString(),x.market||((x.source||"BINANCE")==="TWELVEDATA"?"STOCKS":"CRYPTO"),x.symbol,x.source||"BINANCE",x.tf,x.mode,x.direction,x.entry,x.entryActivated||false,x.activationTs?new Date(x.activationTs).toISOString():"",x.stop,x.tp1,x.tp2,x.tp3,x.longConf,x.shortConf,x.status,x.grossR??"",x.costR??"",x.netR??"",x.feeBps??"",x.slippageBps??"",x.executionPolicy??"",x.trendScore??"",x.momScore??"",x.volScore??"",x.structureScore??"",x.adx??"",x.atrPct??"",x.histUp??"",x.mtf??"",x.session??"",x.sweepScore??"",x.sweepType??"",x.nearestFvgStatus??"",x.nearestFvgType??"",x.premiumDiscount??"",x.frictionBps??"",x.contextScore??"",x.newsRisk??"",x.newsHigh??"",x.liqLong5??"",x.liqShort5??""].join(",")));
  const blob=new Blob([rows.join("\\n")],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),ael=document.createElement("a");ael.href=url;ael.download="crypto-radar-v57-signal-journal.csv";ael.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
}
function clearJournal(){if(confirm("Ștergi tot jurnalul de semnale?")){localStorage.removeItem("signalJournal");renderSignals();toast("Jurnal șters","warn")}}
function drawValidationCurve(vals){
 const cv=$("validationCurve");if(!cv)return;const ctx=cv.getContext("2d"),w=cv.width,h=cv.height,pad=24;ctx.clearRect(0,0,w,h);ctx.strokeStyle="#203148";ctx.lineWidth=1;
 for(let k=0;k<5;k++){let y=pad+k*(h-2*pad)/4;ctx.beginPath();ctx.moveTo(pad,y);ctx.lineTo(w-pad,y);ctx.stroke()}
 let curve=[0],eq=0;for(const v of vals){eq+=v;curve.push(eq)};let mn=Math.min(...curve,0),mx=Math.max(...curve,0),rg=mx-mn||1;
 const y=v=>h-pad-(v-mn)/rg*(h-2*pad),x=i=>pad+i/Math.max(1,curve.length-1)*(w-2*pad);
 ctx.strokeStyle="#69a7ff";ctx.lineWidth=2;ctx.beginPath();curve.forEach((v,i)=>i?ctx.lineTo(x(i),y(v)):ctx.moveTo(x(i),y(v)));ctx.stroke();
 ctx.strokeStyle="#4fd1c5";ctx.setLineDash([5,5]);ctx.beginPath();ctx.moveTo(pad,y(0));ctx.lineTo(w-pad,y(0));ctx.stroke();ctx.setLineDash([])
}
function renderValidation(){
 const src=analysisSource(),a=journal().filter(x=>(x.source||"BINANCE")===src),net=chronologicalRows(a.filter(x=>Number.isFinite(x.netR))),eligible=a.filter(x=>x.status!=="OUT_OF_RANGE"),activated=eligible.filter(x=>x.entryActivated),amb=a.filter(x=>x.status==="AMBIGUOUS").length,expired=a.filter(x=>x.status==="EXPIRED_ENTRY").length,waiting=a.filter(x=>x.status==="WAITING_ENTRY"||x.status==="NEW").length,legacy=a.filter(x=>Number.isFinite(x.rResult)&&!Number.isFinite(x.netR)).length;
 const vals=net.map(x=>x.netR),n=vals.length,w=vals.filter(x=>x>0).length,sum=vals.reduce((q,x)=>q+x,0),gp=vals.filter(x=>x>0).reduce((q,x)=>q+x,0),gl=-vals.filter(x=>x<0).reduce((q,x)=>q+x,0),pf=gl?gp/gl:gp?99:0,avg=n?sum/n:0,dd=n?maxDrawdownR(vals):0,cost=n?net.reduce((q,x)=>q+(x.costR||0),0)/n:0,fill=eligible.length?activated.length/eligible.length*100:0,cfg=appSettings();
 $("validationPolicy").textContent=cfg.executionPolicy==="staged"?"40/35/25 staged":"100% at TP1";$("validationCosts").textContent=`${cfg.feeBps}+${cfg.slippageBps} bps / side`;$("validationLegacy").textContent=legacy;$("validationSample").textContent=n;
 $("valFillRate").textContent=eligible.length?fill.toFixed(1)+"%":"—";$("valExpectancy").textContent=n?avg.toFixed(2)+" R":"—";$("valPf").textContent=n?pf.toFixed(2):"—";$("valDd").textContent=n?dd.toFixed(2)+" R":"—";$("valWin").textContent=n?(w/n*100).toFixed(1)+"%":"—";$("valCost").textContent=n?cost.toFixed(2)+" R":"—";$("valAmbiguous").textContent=amb;$("valWaiting").textContent=waiting+(expired?` · ${expired} expired`:"");
 let state="NOT ENOUGH DATA",why="Need at least 30 cost-aware resolved signals across varied conditions.",cl="neutral";
 if(n>=30){if(avg>0&&pf>=1.2){state="POSITIVE SAMPLE";why="Cost-aware sample is positive. Continue forward validation before scaling capital.";cl="good"}else if(avg<=0||pf<1){state="EDGE DEGRADED";why="Net results do not currently show a positive research edge after modeled costs.";cl="bad"}else{state="MIXED SAMPLE";why="Results are near the validation threshold; more forward samples are needed.";cl="neutral"}}
 $("validationState").textContent=state;$("validationState").className="edgeState "+cl;$("validationWhy").textContent=why;drawValidationCurve(vals);renderForwardLab();renderProfitReadiness(false)
}
function wfTrade(points,threshold,cfg,start,end){
 let vals=[],ambiguityCount=0;for(let z=start;z<end;z++){const p=points[z],dir=p.score>=threshold?1:p.score<=100-threshold?-1:0;if(!dir)continue;let risk=Math.max(p.atr*1.5,p.entry*.0035),stop=p.entry-dir*risk,target=p.entry+dir*risk*2,bars=p.future,hit=null;
   for(const b of bars){let hi=+b[2],lo=+b[3],sh=dir>0?lo<=stop:hi>=stop,th=dir>0?hi>=target:lo<=target;if(sh&&th){ambiguityCount++;hit=-1;break}if(th){hit=2;break}if(sh){hit=-1;break}}
   if(hit==null)continue;let riskFrac=risk/p.entry,costR=riskFrac?2*(cfg.feeBps+cfg.slippageBps)/10000/riskFrac:0;vals.push(hit-costR)}
 vals.ambiguityCount=ambiguityCount;return vals
}
function statsR(vals){let n=vals.length,sum=vals.reduce((a,b)=>a+b,0),gp=vals.filter(x=>x>0).reduce((a,b)=>a+b,0),gl=-vals.filter(x=>x<0).reduce((a,b)=>a+b,0);return {n,avg:n?sum/n:0,pf:gl?gp/gl:gp?99:0,dd:n?maxDrawdownR(vals):0}}
async function runOosValidation(){
 const sym=norm($("symbol").value),tf=$("tf").value,mode=$("mode").value,cfg=appSettings(),src=analysisSource();$("oosNote").textContent=`Running expanding-window validation · ${src}…`;
 try{
  let j=(window.__radarState&&window.__radarState.symbol===sym&&window.__radarState.tf===tf&&window.__radarState.source===src)?window.__radarState.j:await analysisKlines(sym,tf,750,src),horizon=mode==="scalp"?4:mode==="swing"?12:6,points=[];
  for(let i=240;i<j.length-horizon-1;i+=horizon){let q=calc(j.slice(0,i+1),mode);points.push({score:q.score,atr:q.atr,entry:+j[i+1][1],future:j.slice(i+1,i+1+horizon)})}
  let split=Math.floor(points.length*.60),thresholds=[60,64,68,72],best=64,bestAvg=-Infinity;
  for(const th of thresholds){let st=statsR(wfTrade(points,th,cfg,0,split));if(st.n>=20&&st.avg>bestAvg){bestAvg=st.avg;best=th}}
  let oos=statsR(wfTrade(points,best,cfg,split,points.length));
  $("oosThreshold").textContent=best;$("oosTrades").textContent=oos.n;$("oosExpectancy").textContent=oos.n?oos.avg.toFixed(2)+" R":"—";$("oosPf").textContent=oos.n?oos.pf.toFixed(2):"—";$("oosDd").textContent=oos.n?oos.dd.toFixed(2)+" R":"—";
  $("oosNote").textContent=oos.n<20?"OOS sample too small for a useful conclusion.":oos.avg>0&&oos.pf>=1.2?"OOS sample is positive after modeled costs; continue forward testing.":"OOS does not currently confirm a robust positive sample.";
  saveProfitReadinessOos({ts:Date.now(),market:assetClass(),source:src,symbol:sym,tf,mode,n:oos.n,avg:oos.avg,pf:oos.pf,dd:oos.dd,threshold:best,pass:oos.n>=20&&oos.avg>0&&oos.pf>=1.2});renderProfitReadiness(false)
 }catch(e){$("oosNote").textContent="OOS validation unavailable: "+e.message}
}
function renderSrHeat(q){
 const box=$("srHeat");if(!box)return;
 const lv=[["S3",q.levels.s3,"sup"],["S2",q.levels.s2,"sup"],["S1",q.levels.s1,"sup"],["Pivot",q.levels.pivot,"pivot"],["R1",q.levels.r1,"res"],["R2",q.levels.r2,"res"],["R3",q.levels.r3,"res"]];
 const cells=lv.map(([n,v,c])=>{let d=(q.price/v-1)*100,near=Math.abs(d)<=appSettings().nearPct;return `<div class="hc ${c} ${near?"near":""}">${n}<br>${num(v)}<br><span class="small">${d>=0?"+":""}${d.toFixed(2)}%</span></div>`}).join("");
 box.innerHTML=`<div class="hh">Level</div>${lv.map(x=>`<div class="hh">${x[0]}</div>`).join("")}<div class="hh">Price distance</div>${cells}`
}
function updateOrderFlow(q,deriv){
 const last=q.candles[q.candles.length-1],o=+last[1],h=+last[2],l=+last[3],c=+last[4],range=Math.max(h-l,1e-12),closeLoc=(c-l)/range;
 let buy=50+(closeLoc-.5)*42+(q.cmf==null?0:q.cmf*28)+(q.mfi==null?0:(q.mfi-50)*.18)+(q.vwapAbove==null?0:q.vwapAbove?5:-5);buy=Math.max(5,Math.min(95,buy));let sell=100-buy;
 $("buyPressure").textContent=buy.toFixed(0)+"%";$("buyMeter").style.width=buy+"%";$("sellMeter").style.width=sell+"%";
 $("volumeImpulse").textContent=q.vr==null?"—":q.vr.toFixed(2)+"x";$("closeLocation").textContent=(closeLoc*100).toFixed(0)+"%";$("moneyDelta").textContent=(buy-sell>=0?"+":"")+(buy-sell).toFixed(0);
 $("derivPressure").textContent=deriv&&deriv.ls!=null?(deriv.ls>1.15?"LONG HEAVY":deriv.ls<.87?"SHORT HEAVY":"BALANCED"):"N/A";
 $("derivPressure").className="flowBig "+(deriv&&deriv.ls!=null?(deriv.ls>1.15?"good":deriv.ls<.87?"bad":"neutral"):"neutral");
 $("ofLongs").textContent=deriv&&deriv.longPct!=null?deriv.longPct.toFixed(1)+"%":"N/A";$("ofShorts").textContent=deriv&&deriv.shortPct!=null?deriv.shortPct.toFixed(1)+"%":"N/A";
 $("ofOi").textContent=deriv&&deriv.oi?compact(deriv.oi)+(deriv.oiTrend&&deriv.oiTrend!=="N/A"?" · "+deriv.oiTrend:""):"N/A";$("ofFunding").textContent=deriv&&deriv.funding!=null?(deriv.funding*100).toFixed(4)+"%":"N/A";
}
function updateFlowWindow(q){
 const deriv=window.__derivativesState||{},flowScore=(q.mfi==null?0:q.mfi>=55?1:q.mfi<=45?-1:0)+(q.cmf==null?0:q.cmf>0?1:-1)+(q.obvSlope==null?0:q.obvSlope>0?1:-1)+(q.vwapAbove==null?0:q.vwapAbove?1:-1),flowBias=flowScore>=2?"ACCUMULATION":flowScore<=-2?"DISTRIBUTION":"BALANCED";
 $("flowBias").textContent=flowBias;$("flowBias").className=flowBias==="ACCUMULATION"?"good":flowBias==="DISTRIBUTION"?"bad":"neutral";
 $("flowMfi").textContent=q.mfi==null?"—":q.mfi.toFixed(1);$("flowCmf").textContent=q.cmf==null?"—":q.cmf.toFixed(3);$("flowObv").textContent=q.obvSlope==null?"—":q.obvSlope>0?"UP":"DOWN";
 $("flowOi").textContent=deriv.oi?compact(deriv.oi)+(deriv.oiTrend&&deriv.oiTrend!=="N/A"?" · "+deriv.oiTrend:""):"N/A";
 $("flowLs").textContent=deriv.longPct!=null?`${deriv.longPct.toFixed(0)} / ${deriv.shortPct.toFixed(0)}`:"N/A";
 $("flowFunding").textContent=deriv.funding!=null?`${(deriv.funding*100).toFixed(4)}% · ${deriv.context||"BALANCED"}`:"N/A";
 $("flowSummary").textContent=`${flowBias} · ${q.cmf==null?"capital flow —":q.cmf>0?"capital inflow":"capital outflow"} · ${q.vr==null?"volum lipsă":q.vr>=1.2?"volume confirms":"volume weak"}`;
 updateOrderFlow(q,deriv);checkAlerts(q,window.__signalState?.sm,deriv)
}

function pctText(v){return Number.isFinite(v)?(v>=0?"+":"")+v.toFixed(2)+"%":"—"}
function oiChangeAt(hist,barsBack){if(!hist||hist.length<2)return null;let last=hist[hist.length-1],idx=Math.max(0,hist.length-1-barsBack),old=hist[idx],lv=Number(last.sumOpenInterest||last.sumOpenInterestValue||0),ov=Number(old.sumOpenInterest||old.sumOpenInterestValue||0);return ov>0?(lv/ov-1)*100:null}
function fundingSummary(hist){if(!hist||!hist.length)return {avg24:null,avg3d:null,pct:null};const a=hist.map(x=>Number(x.fundingRate)).filter(Number.isFinite),avg=n=>{let z=a.slice(-n);return z.length?z.reduce((x,y)=>x+y,0)/z.length:null},cur=a[a.length-1];return {avg24:avg(3),avg3d:avg(9),pct:Number.isFinite(cur)?pctRank(a,cur):null}}
function renderOiFundingMatrix(q,deriv){
 const d=deriv.oiDeltas||{},fs=deriv.fundingStats||{};$("oi15m").textContent=pctText(d.m15);$("oi1h").textContent=pctText(d.h1);$("oi4h").textContent=pctText(d.h4);$("oi24h").textContent=pctText(d.h24);
 let pchg=window.__radarState&&window.__radarState.tick?Number(window.__radarState.tick.priceChangePercent):null,oi=d.h24,ctx="N/A";if(Number.isFinite(pchg)&&Number.isFinite(oi))ctx=pchg>=0&&oi>=0?"LONG BUILDUP":pchg<0&&oi>=0?"SHORT BUILDUP":pchg>=0&&oi<0?"SHORT COVERING":"LONG UNWINDING";
 $("oiMatrixContext").textContent=ctx;$("oiMatrixContext").className=ctx==="LONG BUILDUP"||ctx==="SHORT COVERING"?"good":ctx==="SHORT BUILDUP"||ctx==="LONG UNWINDING"?"bad":"neutral";$("funding24h").textContent=Number.isFinite(fs.avg24)?(fs.avg24*100).toFixed(4)+"%":"—";$("funding3d").textContent=Number.isFinite(fs.avg3d)?(fs.avg3d*100).toFixed(4)+"%":"—";$("fundingPctile").textContent=Number.isFinite(fs.pct)?fs.pct.toFixed(0)+"%":"—"
}
function renderQuantFlow(q,deriv=window.__derivativesState||{}){
 if(!q)return;
 if(q.deltaFlow.delta==null){for(const id of ["flowDelta","flowDeltaPct","flowCvdSlope","flowCvdDiv"])if($(id)){$(id).textContent="—";$(id).className="lipsa"}}else{$("flowDelta").textContent=compact(Math.abs(q.deltaFlow.delta))+(q.deltaFlow.delta>=0?" buy":" sell");$("flowDelta").className=q.deltaFlow.delta>=0?"good":"bad";$("flowDeltaPct").textContent=pctText(q.deltaFlow.deltaPct);$("flowDeltaPct").className=q.deltaFlow.deltaPct>=0?"good":"bad";$("flowCvdSlope").textContent=(q.deltaFlow.slope20>=0?"+":"")+compact(Math.abs(q.deltaFlow.slope20));$("flowCvdSlope").className=q.deltaFlow.slope20>=0?"good":"bad";$("flowCvdDiv").textContent=q.deltaFlow.divergence;$("flowCvdDiv").className=q.deltaFlow.divergence==="BULL DIV"?"good":q.deltaFlow.divergence==="BEAR DIV"?"bad":"neutral"}
 const f=regimeFusion(q);$("fusionRegime").textContent=f.state;$("fusionRegime").className="regimeBig "+(f.state==="TRENDING"?"good":f.state==="MEAN-REVERTING"||f.state==="CHOPPY"?"neutral":"");$("fusionReason").textContent=f.reason;$("fusionQuality").textContent=f.quality.toFixed(0)+"/100";$("fusionBase").textContent=q.regime;
 $("ttmState").textContent=q.ttm.state;$("ttmMomentum").textContent=(q.ttm.momentum>=0?"+":"")+num(q.ttm.momentum);$("ttmMomentum").className=q.ttm.momentum>=0?"good":"bad";$("chopValue").textContent=q.chop.toFixed(1);$("erValue").textContent=q.efficiency.toFixed(3);$("hurstValue").textContent=q.hurst.toFixed(3);$("rvPercentile").textContent=q.rvPercentile.toFixed(0)+"%";$("parkinsonVol").textContent=q.parkVol.toFixed(2)+"%";$("gkVol").textContent=q.gkVol.toFixed(2)+"%";
 const cv=q.calendarVwaps;$("vwapCalendar").textContent=`D ${numSau(cv.day)} · W ${numSau(cv.week)} · M ${numSau(cv.month)}`;$("vwapBand1").textContent=`${numSau(q.vwapBands.l1)} ↔ ${numSau(q.vwapBands.u1)}`;$("vwapBand2").textContent=`${numSau(q.vwapBands.l2)} ↔ ${numSau(q.vwapBands.u2)}`;
 const L=q.liquidity;$("liqPrevDay").textContent=L.prevDay?`${num(L.prevDay.low)} / ${num(L.prevDay.high)}`:"N/A";$("liqPrevWeek").textContent=L.prevWeek?`${num(L.prevWeek.low)} / ${num(L.prevWeek.high)}`:"N/A";$("liqEqHigh").textContent=L.equalHigh?num(L.equalHigh):"None";$("liqEqLow").textContent=L.equalLow?num(L.equalLow):"None";$("liqPremium").textContent=L.premium;
 if(L.fvg){$("fvgType").textContent=L.fvg.type;$("fvgStatus").textContent=L.fvg.status;$("fvgZone").textContent=`${num(L.fvg.low)} ↔ ${num(L.fvg.high)}`}else{$("fvgType").textContent=$("fvgStatus").textContent=$("fvgZone").textContent="None"}
 renderOiFundingMatrix(q,deriv)
}
function applyNetworkState(){const on=navigator.onLine!==false,b=$("offlineBanner"),networkFns=/\b(analyze|runPionexScan|runStockScan|loadExternalIntelligence|loadEconomicCalendar|loadOnchainIntel|loadPredictiveLiquidationMap|loadOptionsIntel|loadHistoricalCvd|loadCloudMonitor|checkPionexHealth|runHealthCheck|loadReplayHistory|runHistoricalScanner)\s*\(/;if(b)b.hidden=on;document.body.classList.toggle("offlineMode",!on);for(const el of document.querySelectorAll("button[data-action-click]")){const needs=networkFns.test(el.dataset.actionClick||"");if(needs){el.disabled=!on;el.setAttribute("aria-disabled",String(!on));if(!on)el.title="Unavailable offline";else if(el.title==="Unavailable offline")el.removeAttribute("title")}}if($("status")&&!on)$("status").textContent="OFFLINE · read-only local research mode";return on}
window.addEventListener("online",()=>{applyNetworkState();toast("Network restored","good")});window.addEventListener("offline",()=>{applyNetworkState();toast("Offline · local research remains available","warn")});
async function analyze(save,fallbackTried=false){
 if(!applyNetworkState()){toast("Offline · analysis requires network. Local journal/reports remain available.","warn");return}
 let sym=norm($("symbol").value),t=$("tf").value,mode=$("mode").value,src=analysisSource();
 if(assetClass()==="CRYPTO"&&src==="PIONEX"&&pionexCooldownRemaining()>0){setAnalysisSource("BINANCE");src="BINANCE";toast("Pionex este în cooldown · am revenit automat la Binance.","warn")}
 invalidateDecisionContext(sym,src,t,false);
 $("symbol").value=assetClass()==="STOCKS"?stockSymbol(sym):coin(sym);syncTop(sym,t,mode);updateSourceLineage(src);setBusy(true,`Actualizare engine · ${src}…`);
 try{
  let [j,tick,m]=await Promise.all([analysisKlines(sym,t,750,src),analysisTicker(sym,src),mtfData(sym,src)]);
  const jInchise=bareInchise(j,t,Date.now(),src);
  if(!jInchise||jInchise.length<100)throw Error(`${src} returned insufficient candle history`);
  let q=calc(jInchise,mode),hs=historicalSet(jInchise),mc=mtfComposite(m);
  // pretul VIU (bara in formare / ticker) doar pentru ecran; semnalele stau pe q.price (inchis)
  const pretViu=Number.isFinite(+j.at(-1)?.[4])?+j.at(-1)[4]:q.price;
  window.__radarState={symbol:sym,tf:t,mode,j,q,m,tick,hs,source:src};
  const breadthPromise=refreshMarketBreadthV64(false,false).catch(()=>null);
  if(save){remember(sym);localStorage.setItem("mode",mode);if(assetClass()==="STOCKS")localStorage.setItem("lastStock",stockSymbol(sym));else localStorage.setItem("lastCrypto",coin(sym))}
  let hp=hs.h4,avg=mc.avg,comp=mc.comp,confidence=mc.confidence;
  updateSignalUI(q,hs,mc);signalExplanation(q,hs,mc);renderLifecycle();startProviderLive(sym,src);renderVolatility(q,j);renderVolatilityIntelligence(false);renderSetupQuality();renderDailyDesk();renderStrategyLifecycle();renderAdvancedProfile();renderStructureSession();renderMlLens();renderDecisionWaterfall();loadContextIntel(false).catch(()=>{});persistCurrentSnapshot(false).catch(()=>{});
  if(assetClass()==="STOCKS"){window.__derivativesState={};renderLiquidationProxy(q,{});renderQuantFlow(q,{});loadStockContext().catch(()=>{})}
  else{renderLiquidationProxy(q,window.__derivativesState||{});renderQuantFlow(q,window.__derivativesState||{})}
  buildDecision(q,hs,mc,window.__signalState.sm);autoLogResearchSetup();checkAlertsPro();v60AutoReviewResolved();evaluateResearchJournalSilent().then(()=>{v60AutoReviewResolved();renderEdgePro()}).catch(()=>{});
  const ss=window.__signalState;
  $("heroPrice").textContent=num(pretViu);
  $("heroSignal").textContent=ss.sm.direction;$("heroSignal").className="heroSignal "+(ss.sm.direction==="LONG"?"good":ss.sm.direction==="SHORT"?"bad":"neutral");
  $("heroConfidence").textContent=`LONG ${ss.sm.long.toFixed(0)} · SHORT ${ss.sm.short.toFixed(0)}`;
  $("heroRegime").textContent=q.regime;$("heroAdx").textContent=`ADX ${q.adx.toFixed(0)}`;$("heroProb").textContent=knnEticheta(hs.h4).text;
  let heroCh=botiNr(tick.priceChangePercent);$("hero24").textContent=heroCh===null?"—":(heroCh>=0?"+":"")+heroCh.toFixed(2)+"%";$("hero24").className="qv "+(heroCh===null?"neutral":heroCh>=0?"good":"bad");
  $("heroMtf").textContent=mc.avg.toFixed(0)+"/100";$("heroVol").textContent=q.atrPct.toFixed(2)+"%";$("heroVol24").textContent=botiNr(tick.quoteVolume)===null?"—":compact(+tick.quoteVolume);

  $("verdict").textContent=comp;$("verdict").className="value "+cls(comp);$("fill").style.width=avg+"%";$("conf").textContent=`Weighted Multi-TF ${avg.toFixed(0)}/100 · acord ${confidence}% · ${q.regime}`;
  if(hp){const ke=knnEticheta(hp);$("pverdict").textContent=hp.ver+" · nedovedit";$("pverdict").className="value "+ke.cls;$("pfill").style.width=hp.up+"%";$("pstats").textContent=`kNN: ${hp.k} analogi · ↑ ${hp.up.toFixed(1)}% ±${hp.banda.toFixed(1)} (banda de zgomot) · ↓ ${hp.down.toFixed(1)}% · medie 4 lumânări ${hp.avg>=0?"+":""}${hp.avg.toFixed(2)}% · NEDOVEDIT: pe mers aleator ghicește direcția în 48,8% din cazuri, deci nu intră în scor`}if(hp){let gv=Math.round(hp.up);$("probGauge").style.setProperty("--p",gv);$("probGauge").style.setProperty("--gc",hp.inBanda?"#8a98ab":gv>=58?"#55d89b":gv<=42?"#ff6b78":"#f5c451");$("gaugeVal").textContent=gv+"% ±"+hp.banda.toFixed(0);$("gaugeLabel").textContent=hp.ver+" · nedovedit";$("gaugeLabel").className="value "+knnEticheta(hp).cls}

  $("price").textContent=num(pretViu);let ch=botiNr(tick.priceChangePercent);$("change").textContent=ch===null?"—":(ch>=0?"+":"")+ch.toFixed(2)+"%";$("change").className="value "+(ch===null?"neutral":ch>=0?"good":"bad");$("volume24").textContent=botiNr(tick.quoteVolume)===null?"—":compact(+tick.quoteVolume);$("score").textContent=Math.round(q.score)+"/100";
  $("rsi").textContent=q.rsi.toFixed(1);$("ema").textContent=q.ema? "Bull stack":"Mixed / bear";$("ema").className=q.ema?"good":"bad";
  $("macd").textContent=q.macd?"Pozitiv":"Negativ";$("macd").className=q.macd?"good":"bad";
  $("adx").textContent=`${q.adx.toFixed(1)} · +DI ${q.pdi.toFixed(0)} / -DI ${q.mdi.toFixed(0)}`;$("adx").className=q.adx>=25?(q.pdi>q.mdi?"good":"bad"):"neutral";
  $("supertrend").textContent=q.supertrend;$("supertrend").className=q.supertrend==="BULL"?"good":"bad";
  $("stoch").textContent=q.stoch.toFixed(1);$("stoch").className=q.stoch>=55?"good":q.stoch<=45?"bad":"neutral";
  $("bb").textContent=q.bbpos.toFixed(0)+"%";$("bb").className=q.bbpos>55?"good":q.bbpos<45?"bad":"neutral";
  $("vwap").textContent=q.vwapAbove==null?"—":q.vwapAbove?"Peste VWAP":"Sub VWAP";$("vwap").className=q.vwapAbove==null?"lipsa":q.vwapAbove?"good":"bad";
  $("atrp").textContent=`${q.atrPct.toFixed(2)}% · ATR ${num(q.atr)}`;$("vr").textContent=q.vr==null?"—":q.vr.toFixed(2)+"x";$("sr").textContent=num(q.sup)+" / "+num(q.res);$("mfi").textContent=q.mfi==null?"—":q.mfi.toFixed(1);$("mfi").className="n "+(q.mfi==null?"lipsa":q.mfi>=55?"good":q.mfi<=45?"bad":"neutral");$("obv").textContent=q.obvSlope==null?"—":q.obvSlope>0?"UP":"DOWN";$("obv").className="n "+(q.obvSlope==null?"lipsa":q.obvSlope>0?"good":"bad");$("ichi").textContent=q.ichimoku;$("ichi").className="n "+(q.ichimoku==="BULL"?"good":q.ichimoku==="BEAR"?"bad":"neutral");$("divergence").textContent=q.divergence;$("divergence").className="n "+(q.divergence==="BULL DIV"?"good":q.divergence==="BEAR DIV"?"bad":"neutral");
  $("pivot").textContent=num(q.levels.pivot);$("s1").textContent=num(q.levels.s1);$("s2").textContent=num(q.levels.s2);$("s3").textContent=num(q.levels.s3);$("r1").textContent=num(q.levels.r1);$("r2").textContent=num(q.levels.r2);$("r3").textContent=num(q.levels.r3);$("range50").textContent=num(q.levels.range);
  $("pivotBias").textContent=q.levels.bias;$("pivotBias").className=(q.levels.bias.includes("BULL")?"good":q.levels.bias.includes("BEAR")?"bad":"neutral");
  $("breakAbove").textContent=num(q.levels.breakAbove);$("breakBelow").textContent=num(q.levels.breakBelow);$("nearestZone").textContent=q.levels.nearest;
  renderSrHeat(q);updateFlowWindow(q);

  let bo=$("breakout");bo.textContent=q.breakout==="UP"?"▲ Breakout":q.breakout==="DOWN"?"▼ Breakdown":"În canal";bo.className=q.breakout==="UP"?"good":q.breakout==="DOWN"?"bad":"neutral";

  $("signal").textContent=q.signal;$("signal").className="value "+(q.signal==="LONG"?"good":q.signal==="SHORT"?"bad":"neutral");$("enginefill").style.width=q.score+"%";$("quality").textContent=`Confluență ${q.confluence.toFixed(0)}/100 · calitate ${q.quality} · scor ${q.score.toFixed(0)}/100`;
  $("regime").textContent=q.regime;$("trendScore").textContent=q.trendScore.toFixed(0)+"/100";$("momScore").textContent=q.momScore.toFixed(0)+"/100";$("smcScore").textContent=q.structureScore.toFixed(0)+"/100";
  $("bos").textContent=q.smc.bos;$("sweep").textContent=q.smc.sweep;$("fvg").textContent=q.smc.fvg;$("volumeSignal").textContent=q.vr==null?"—":q.vr>=1.5?"PUTERNIC":q.vr>=1.1?"CONFIRMĂ":"SLAB";
  let htxt=[];for(const [lab,h] of [["1",hs.h1],["4",hs.h4],["12",hs.h12]])if(h)htxt.push(`${lab}c ${h.up.toFixed(0)}%↑ ±${Number.isFinite(+h.banda)?h.banda.toFixed(0):"?"}`);$("knnset").textContent=htxt.length?htxt.join(" · ")+" · nedovedit":"N/A";
  $("engineNotes").textContent=`Profil ${mode.toUpperCase()} · ${q.regime}. Trend ${q.trendScore.toFixed(0)}, momentum ${q.momScore.toFixed(0)}, volum ${q.volScore==null?"— (lipsește, scos din scor)":q.volScore.toFixed(0)}, structură ${q.structureScore.toFixed(0)}. Filtrul de liquidity trap este ${q.smc.trap?"ACTIV":"inactiv"}. Confidence LONG/SHORT este calculat separat în tab-ul Signals.`;

  let dir=mc.comp==="BULLISH"?1:mc.comp==="BEARISH"?-1:0,baseStop=Math.max(q.atr*1.8,q.price*.004),inv,tar,trail,txt,risk;
  if(dir>0){inv=Math.max(q.sup,q.price-baseStop);let r=q.price-inv;tar=q.price+r*2.0;trail=q.price-q.atr*1.5;txt="Confluență bullish: trend, momentum, structură și MTF sunt combinate. Confirmarea ideală este volum peste medie și lipsa unui liquidity trap."}
  else if(dir<0){inv=Math.min(q.res,q.price+baseStop);let r=inv-q.price;tar=Math.max(0,q.price-r*2.0);trail=q.price+q.atr*1.5;txt="Confluență bearish: motorul optimizează separat direcția short și penalizează breakout-urile fără volum sau sweep-urile adverse."}
  else{inv=q.sup;tar=q.res;trail=q.price;txt="Engine-ul nu are suficientă confluență direcțională. Zona support/resistance este mai relevantă decât forțarea unei intrări."}
  risk=q.atrPct>=4||q.confluence<45?"Ridicat":q.atrPct>=2.2||q.confluence<62?"Mediu":"Controlat";
  $("setup").textContent=txt;$("invalid").textContent=num(inv);$("target").textContent=num(tar);$("trail").textContent=num(trail);$("risk").textContent=risk;
  $("topLive").className="statusChip live";$("topLive").textContent=src+" DATA";draw(q);renderVolumeProfile();if(assetClass()==="CRYPTO")loadFearGreed();else{$("fearGreed").textContent="N/A";$("sentimentText").textContent="Crypto Fear & Greed is not used in US stock scoring."}loadMarketContext();
  if(assetClass()==="CRYPTO"){derivatives().catch(()=>{});if(!pionexScannerActive)loadPionexMicrostructure().catch(()=>{})}
  await breadthPromise;
  updateDecisionCoreAfterAnalysis();renderV65DecisionOS(true);renderV66EdgeValidation(true);if(typeof renderV67Operations==="function")renderV67Operations(true);
  $("status").textContent=assetClass()==="STOCKS"?`${stockSymbol(sym)} · USD · ${t} · ${mode.toUpperCase()} · ${src} · ${new Date().toLocaleTimeString()}`:`${coin(sym)}/USDT · ${t} · ${mode.toUpperCase()} · ${src} · ${new Date().toLocaleTimeString()}`;setBusy(false);toast(`${coin(sym)} analizat · ${window.__signalState.sm.direction}`,"good");
 }catch(e){
   const failedSource=src;
   if(assetClass()==="CRYPTO"&&failedSource==="PIONEX"&&!fallbackTried){
     setBusy(false);setAnalysisSource("BINANCE");
     $("topLive").className="statusChip warn";$("topLive").textContent="PIONEX → BINANCE";
     toast("Pionex indisponibil · fallback automat la Binance.","warn");
     return analyze(save,true)
   }
   setBusy(false,"Eroare "+failedSource+": "+e.message);
   $("topLive").className="statusChip warn";$("topLive").textContent="DATA ERROR";
   toast("Eroare: "+e.message,"bad")
 }
}
async function multiTF(){
 let sym=norm($("symbol").value),src=analysisSource();$("mtfout").innerHTML=`Se încarcă ${src}…`;$("mtfheat").innerHTML="";let m=await mtfData(sym,src),mc=mtfComposite(m);
 $("mtfout").innerHTML=`<div class="row"><span>Scor ponderat</span><b>${mc.avg.toFixed(0)}/100 · ${mc.comp}</b></div>`+
 m.map(x=>`<div class="row"><b>${x.tf}</b><span>${x.regime} · ADX ${x.adx.toFixed(0)} · RSI ${x.rsi.toFixed(0)}</span><b class="${cls(x.ver)}">${x.score.toFixed(0)}</b></div>`).join("");
 const cols=["15m","1h","4h","1d"],by=Object.fromEntries(m.map(x=>[x.tf,x]));
 const cell=(v,txt)=>`<div class="hmCell ${v>55?"hmBull":v<45?"hmBear":"hmNeu"}">${txt}</div>`;
 let h=`<div></div>${cols.map(x=>`<div class="hmHead">${x}</div>`).join("")}`;
 h+=`<div class="hmLabel">Score</div>${cols.map(tf=>by[tf]?cell(by[tf].score,by[tf].score.toFixed(0)):'<div class="hmCell">—</div>').join("")}`;
 h+=`<div class="hmLabel">RSI</div>${cols.map(tf=>by[tf]?cell(by[tf].rsi,by[tf].rsi.toFixed(0)):'<div class="hmCell">—</div>').join("")}`;
 h+=`<div class="hmLabel">Trend</div>${cols.map(tf=>by[tf]?cell(by[tf].trendScore,by[tf].trendScore.toFixed(0)):'<div class="hmCell">—</div>').join("")}`;
 h+=`<div class="hmLabel">SMC</div>${cols.map(tf=>by[tf]?cell(by[tf].structureScore,by[tf].structureScore.toFixed(0)):'<div class="hmCell">—</div>').join("")}`;
 $("mtfheat").innerHTML=h;
}
async function backtestCurrent(){
 const box=$("backtestout"),sym=norm($("symbol").value),tf=$("tf").value,mode=$("mode").value,cfg=appSettings(),src=analysisSource();box.textContent=`Rulez cost-aware walk-forward · ${src}…`;
 try{
  let j=(window.__radarState&&window.__radarState.symbol===sym&&window.__radarState.tf===tf&&window.__radarState.source===src)?window.__radarState.j:await analysisKlines(sym,tf,750,src),horizon=mode==="scalp"?4:mode==="swing"?12:6,points=[];
  for(let i=240;i<j.length-horizon-1;i+=horizon){let q=calc(j.slice(0,i+1),mode);points.push({score:q.score,atr:q.atr,entry:+j[i+1][1],future:j.slice(i+1,i+1+horizon)})}
  let split=Math.floor(points.length*.60),thresholds=[60,64,68,72],best=64,bestTrain=null;
  for(const th of thresholds){let st=statsR(wfTrade(points,th,cfg,0,split));if(st.n>=20&&(!bestTrain||st.avg>bestTrain.avg)){best=th;bestTrain=st}}
  let oos=statsR(wfTrade(points,best,cfg,split,points.length)),all=statsR(wfTrade(points,best,cfg,0,points.length));
  if(!all.n){box.textContent="Nu sunt suficiente tranzacții pentru acest profil.";return}
  box.innerHTML=`<div class="row"><span>Selected threshold · train only</span><b>${best}</b></div><div class="row"><span>Total cost-aware trades</span><b>${all.n}</b></div><div class="row"><span>Net expectancy</span><b>${all.avg.toFixed(2)} R</b></div><div class="row"><span>Net profit factor</span><b>${all.pf.toFixed(2)}</b></div><div class="row"><span>Max drawdown</span><b>${all.dd.toFixed(2)} R</b></div><div class="row"><span>OOS trades · last 40%</span><b>${oos.n}</b></div><div class="row"><span>OOS net expectancy</span><b>${oos.n?oos.avg.toFixed(2)+" R":"—"}</b></div><div class="row"><span>OOS profit factor</span><b>${oos.n?oos.pf.toFixed(2):"—"}</b></div><p class="note">Expanding-window heuristic. Threshold is selected only on the first 60%; the final 40% is evaluated without retuning. Includes configured fees/slippage. Intrabar stop/target conflicts use conservative stop-first resolution.</p>`;
 }catch(e){box.textContent="Backtest indisponibil: "+e.message}
}
async function derivatives(){
 if(assetClass()==="STOCKS"){$("ftext").textContent="Crypto futures context is not mixed into US stock signals.";for(const id of ["funding","oi","lsratio","fcontext","fundingBias","crowdingRisk","oiContext"])if($(id))$(id).textContent="N/A";window.__derivativesState={};return}
 let sym=norm($("symbol").value);$("ftext").textContent="Se încarcă date futures…";
 let d=null,histOI=null,fundingHist=null,motivFutures="";
 try{d=await getJSON(`/api/market?type=futures&symbol=${encodeURIComponent(sym)}`);histOI=d&&d.oiHist5m||null;fundingHist=d&&d.fundingHist||null}
 catch(e){motivFutures=/AUTH_RATE_LIMITED/.test(String(e.message||""))||e.status===429&&/AUTH_/.test(String(e.message||""))?"Prea multe parole greșite de pe acest calculator - așteaptă un minut și verifică parola din Setări (⚙).":eroareDeParola(e.message,e.status)?"Serverul cere parola aplicației pentru futures - pune-o în Setări (⚙).":"Serverul nu a dat futures ("+textEroare(e)+")."}
 if(!d||[d.funding,d.openInterest,d.longShort].every(x=>x==null)){
   try{
    let [fr,oi,ls,oih,fh]=await Promise.all([
      getJSON(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${encodeURIComponent(sym)}`).catch(()=>null),
      getJSON(`https://fapi.binance.com/fapi/v1/openInterest?symbol=${encodeURIComponent(sym)}`).catch(()=>null),
      getJSON(`https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=${encodeURIComponent(sym)}&period=1h&limit=1`).catch(()=>null),
      getJSON(`https://fapi.binance.com/futures/data/openInterestHist?symbol=${encodeURIComponent(sym)}&period=5m&limit=289`).catch(()=>null),
      getJSON(`https://fapi.binance.com/fapi/v1/fundingRate?symbol=${encodeURIComponent(sym)}&limit=30`).catch(()=>null)
    ]);
    d={funding:fr?Number(fr.lastFundingRate):null,openInterest:oi?Number(oi.openInterest):null,longShort:ls&&ls.length?Number(ls[0].longShortRatio):null};
    histOI=oih;fundingHist=fh;
   }catch{}
 }
 let fr=d&&d.funding!=null?Number(d.funding):null,oi=d&&d.openInterest!=null?Number(d.openInterest):null,ls=d&&d.longShort!=null?Number(d.longShort):null;
 let oiDeltas={m15:oiChangeAt(histOI,3),h1:oiChangeAt(histOI,12),h4:oiChangeAt(histOI,48),h24:oiChangeAt(histOI,288)},oiTrend=Number.isFinite(oiDeltas.h1)?pctText(oiDeltas.h1):"N/A",fundingStats=fundingSummary(fundingHist);
 $("funding").textContent=fr==null?"N/A":(fr*100).toFixed(4)+"%";
 $("oi").textContent=oi==null?"N/A":compact(oi);
 $("lsratio").textContent=ls==null?"N/A":Number(ls).toFixed(2);
 let crowd=0;if(fr!=null){if(fr>.0003)crowd--;else if(fr<-.0003)crowd++}if(ls!=null){if(ls>1.5)crowd--;else if(ls<.67)crowd++}
 let context=crowd>0?"CONTRARIAN +":crowd<0?"CROWDED":"BALANCED";
 $("fcontext").textContent=context;$("fcontext").className="value "+(context==="CONTRARIAN +"?"good":context==="CROWDED"?"bad":"neutral");
 $("fundingBias").textContent=fr==null?"N/A":fr>.0003?"Long crowded":fr<-.0003?"Short crowded":"Balanced";
 $("crowdingRisk").textContent=ls==null?"N/A":ls>1.5||ls<.67?"Ridicat":"Normal";
 $("oiContext").textContent=oi==null?"N/A":"OI "+compact(oi)+(oiTrend!=="N/A"?" · "+oiTrend:"");
 let longPct=ls==null?null:(ls/(1+ls))*100, shortPct=ls==null?null:(100-(ls/(1+ls))*100);
 window.__derivativesState={funding:fr,oi,ls,context,longPct,shortPct,oiTrend,oiDeltas,fundingStats};markFresh("futures");
 if(window.__radarState&&window.__radarState.q){updateFlowWindow(window.__radarState.q);renderLiquidationProxy(window.__radarState.q,window.__derivativesState);renderQuantFlow(window.__radarState.q,window.__derivativesState)}
 $("ftext").textContent=(fr==null&&oi==null&&ls==null)?("Datele futures sunt indisponibile momentan; analiza spot rămâne complet funcțională."+(motivFutures?" "+motivFutures:"")):"Funding, OI și long/short oferă context pentru crowding și presiunea poziționării, dar nu sunt semnal suficient singure.";
}
let scannerRows=[];
function renderScan(){
 let dir=$("scanDir")?.value||"ALL",reg=$("scanRegime")?.value||"ALL",minAdx=+($("scanAdx")?.value||0),minStrength=+($("scanScore")?.value||0),q=($("scanSearch")?.value||"").trim().toUpperCase(),sort=$("scanSort")?.value||"strength";
 let rows=scannerRows.filter(x=>(!q||x.c.includes(q))&&(dir==="ALL"||x.dir===dir)&&(reg==="ALL"||x.regime.includes(reg))&&x.adx>=minAdx&&(!minStrength||Math.abs(x.avg-50)*2>=minStrength));
 // Forta = |scor-50|*2, ca filtrul "Forta >= X". Un scor lipsa (NaN) facea
 // comparatorul inconsistent - acum sta la coada.
 const forta=x=>Number.isFinite(+x.avg)?Math.abs(+x.avg-50)*2:-1;
 rows=[...rows].sort((a,b)=>sort==="turnover"?(b.turnover??-1)-(a.turnover??-1):sort==="adx"?b.adx-a.adx:sort==="change"?Math.abs(b.change)-Math.abs(a.change):(forta(b)-forta(a))||(b.turnover-a.turnover));
 const stockMode=assetClass()==="STOCKS";
 $("scanout").innerHTML=rows.length?rows.map(x=>`<div class="coin" data-action-click="${stockMode?"selectStockScan":"selectPionexScan"}('${x.c}')"><b>${escapeHtml(x.c)}</b><span>${Number.isFinite(+x.avg)?(+x.avg).toFixed(0):"—"} <small class="muted">forță ${forta(x)>=0?forta(x).toFixed(0):"—"}</small></span><b class="${cls(x.dir)}">${x.dir}</b><span>${x.adx.toFixed(0)}</span><span>${x.regime}</span><span>${x.conf.toFixed(0)}</span><span>${x.turnover==null?"—":compact(x.turnover)}</span></div>`).join(""):`<div class="row"><span>${stockMode?"No US stock results for current filters.":"Niciun rezultat Pionex pentru filtrele selectate."}</span></div>`;
}
let activeScanToken=null;
function cancelScan(){
 if(activeScanToken){activeScanToken.cancelled=true;perfStats.lastScanner="CANCELLED";scanButonStop(false);toast("Scan oprit","warn")}
}
async function scan(){
 if(assetClass()==="STOCKS")return scanStocks();
 let box=$("scanout"),depth=$("scanDepth")?.value||"FAST";
 if(activeScanToken)activeScanToken.cancelled=true;
 const token={cancelled:false,id:Date.now()},started=performance.now();activeScanToken=token;pionexScannerActive=true;scannerRows=[];perfStats.lastScanner="RUNNING";
 scanButonStop(true);$("scanProgressBar").style.width="0%";$("scanProcessed").textContent="0/0";$("scanResults").textContent="0";$("scanErrors").textContent="0";$("scanCacheHits").textContent=perfStats.pionexCacheHits;$("scanElapsed").textContent="0s";
 box.innerHTML="Încarc universul Pionex · analiza tehnică va folosi Binance…";
 try{
   const universPionex=await pionexTop100();
   if(token.cancelled)return;
   if(!universPionex.length)throw Error("Pionex nu a returnat piețe SPOT/USDT eligibile");
   // Fara lista Binance (a picat), nu ghicim: se incearca toate, ca inainte.
   const peBinance=await binanceSimboluriSpot().catch(()=>null);
   const top=peBinance?universPionex.filter(x=>peBinance.has(`${String(x.base||"").toUpperCase()}USDT`)):universPionex;
   const sarite=universPionex.length-top.length;
   if(!top.length)throw Error("Niciuna dintre monedele Pionex nu e pe Binance");
   $("pionexScanMode").textContent=(depth==="DEEP"?"Mode DEEP MTF · Binance candles":"Mode FAST 4H · Binance candles")+(sarite?` · ${sarite} sărite (nu sunt pe Binance)`:"");
   $("scanProcessed").textContent=`0/${top.length}`;
   const concurrency=4;
   const worker=async item=>depth==="DEEP"?pionexScanDeep(item):pionexScanFast(item);
   const progress=(done,total,out,errors)=>{
     if(token.cancelled)return;
     const good=out.filter(Boolean);scannerRows=good;
     $("scanProgressBar").style.width=(100*done/total).toFixed(1)+"%";$("scanProcessed").textContent=`${done}/${total}`;$("scanResults").textContent=good.length;$("scanErrors").textContent=errors;$("scanCacheHits").textContent=perfStats.pionexCacheHits;$("scanElapsed").textContent=((performance.now()-started)/1000).toFixed(1)+"s";
     if(done%10===0||done===total)renderScan()
   };
   const run=await runPool(top,worker,concurrency,progress,token);
   if(token.cancelled){box.innerHTML='<div class="row"><span>Scan oprit de utilizator.</span></div>';return}
   scannerRows=run.results;renderScan();const scanBreadth=v64BreadthFromAnalysisRows(scannerRows,{market:assetClass(),source:analysisSource(),total:scannerRows.length,depth:"SCANNER",universe:"CURRENT SCANNER RESULTS"});if(!window.__marketBreadthV64||Date.now()-(+window.__marketBreadthV64.ts||0)>10*60000)renderMarketBreadthV64(scanBreadth);renderOpportunity();renderDailyDesk();perfStats.lastScanner=`OK ${run.results.length}/${top.length} · PIONEX UNIVERSE / BINANCE DATA`;persistScannerHistory("CRYPTO","BINANCE",top.length,run.results,`PIONEX_${depth}`).catch(()=>{});
   toast(`Pionex universe / Binance engine: ${run.results.length}/${top.length} analizate`,"good")
 }catch(e){
   if(!token.cancelled){box.innerHTML=`<div class="row"><span>Scanner error.</span><b>${escapeHtml(e.message)}</b></div>`;perfStats.lastScanner="SCANNER ERROR · "+e.message;toast("Scanner error: "+e.message,"bad")}
 }finally{
   pionexScannerActive=false;
   if(activeScanToken===token){activeScanToken=null;scanButonStop(false)}
   $("scanElapsed").textContent=((performance.now()-started)/1000).toFixed(1)+"s"
 }
}


/* v60 retains v58 Replay & Historical Scanner Pro
   Invariant: scoring functions receive prefix-only candles. Future bars are passed only to outcome evaluators after scoring. */
const REPLAY_MIN_BARS=220;
let replayState={rows:[],index:-1,symbol:"",market:"",source:"",tf:"4h",mode:"auto",playing:false,timer:null,session:[],archiveToken:0};
let historicalScannerRows=[],historicalScanToken=null,historicalUniverseMeta=null;
function replayPrefix(rows,index){const i=Math.max(0,Math.min(rows.length-1,Math.trunc(+index||0)));return rows.slice(0,i+1)}
function replayLastIndexAtOrBefore(rows,ts){let lo=0,hi=rows.length-1,ans=-1;while(lo<=hi){const m=(lo+hi)>>1;if(+rows[m][0]<=ts){ans=m;lo=m+1}else hi=m-1}return ans}
function replayCostPct(){const x=appSettings();return 2*((+x.feeBps||0)+(+x.slippageBps||0))/100}
function replayOutcome(rows,index,horizon,direction){const i=Math.trunc(index),h=Math.max(1,Math.trunc(+horizon||1));if(i<0||i+h>=rows.length)return null;const entry=+rows[i][4],exit=+rows[i+h][4];if(!(entry>0&&exit>0))return null;const raw=(exit/entry-1)*100,cost=replayCostPct(),net=direction==="LONG"?raw-cost:direction==="SHORT"?-raw-cost:null;return {entry,exit,rawPct:raw,netPct:net,horizon:h,hit:Number.isFinite(net)?net>0:null}}
function replayFrame(rows,index,mode="auto",horizon=12){const prefix=replayPrefix(rows,index);if(prefix.length<REPLAY_MIN_BARS)return null;const q=calc(prefix,mode),outcome=replayOutcome(rows,index,horizon,q.signal);return {ts:+prefix.at(-1)[0],index,prefixN:prefix.length,q,direction:q.signal,outcome}}
function replaySyncControls(){if($('replaySymbol')&&!$('replaySymbol').value)$('replaySymbol').value=coin(norm($('symbol').value));if($('replayTf'))$('replayTf').value=$('tf')?.value||'4h';if($('replayMode'))$('replayMode').value=$('mode')?.value||'auto'}
function renderReplayLab(){replaySyncControls();if(replayState.rows.length)renderReplayFrame();else if($('replayStatus'))$('replayStatus').textContent='Load history to start.'}
async function loadReplayHistory(){
  if(!navigator.onLine)throw Error('Replay history requires network data');pauseReplay();const market=assetClass(),src=analysisSource(),raw=($('replaySymbol')?.value||$('symbol').value||'').trim(),sym=market==='STOCKS'?stockSymbol(raw):norm(raw),tf=$('replayTf')?.value||$('tf')?.value||'4h',mode=$('replayMode')?.value||$('mode')?.value||'auto',limit=Math.max(300,Math.min(1000,+$('replayBars')?.value||1000));
  $('replayStatus').textContent=`Loading ${sym} ${tf} · ${src}…`;
  try{const rows=await analysisKlines(sym,tf,limit,src);if(!rows||rows.length<REPLAY_MIN_BARS+25)throw Error(`Need at least ${REPLAY_MIN_BARS+25} candles; provider returned ${rows?.length||0}`);replayState={...replayState,rows:[...rows].sort((a,b)=>+a[0]-+b[0]),index:Math.max(REPLAY_MIN_BARS-1,rows.length-31),symbol:sym,market,source:src,tf,mode,session:[],archiveToken:replayState.archiveToken+1};$('replaySlider').min=REPLAY_MIN_BARS-1;$('replaySlider').max=replayState.rows.length-1;$('replaySlider').value=replayState.index;$('replayStatus').textContent=`${replayState.rows.length} candles loaded · ${market} · ${src}`;renderReplayFrame();toast('Replay history loaded','good')}catch(e){$('replayStatus').textContent='Replay unavailable · '+e.message;toast(e.message,'bad')}
}
function setReplayIndex(v){if(!replayState.rows.length)return;pauseReplay();replayState.index=Math.max(REPLAY_MIN_BARS-1,Math.min(replayState.rows.length-1,Math.trunc(+v||0)));$('replaySlider').value=replayState.index;renderReplayFrame()}
function stepReplay(n=1){if(!replayState.rows.length)return;pauseReplay();replayState.index=Math.max(REPLAY_MIN_BARS-1,Math.min(replayState.rows.length-1,replayState.index+Math.trunc(+n||1)));$('replaySlider').value=replayState.index;renderReplayFrame()}
function pauseReplay(){if(replayState.timer)clearInterval(replayState.timer);replayState.timer=null;replayState.playing=false;if($('replayPlayBtn'))$('replayPlayBtn').textContent='▶ Play'}
function toggleReplayPlay(){if(!replayState.rows.length)return toast('Load replay history first','warn');if(replayState.playing){pauseReplay();return}replayState.playing=true;$('replayPlayBtn').textContent='Ⅱ Pause';replayState.timer=setInterval(()=>{if(replayState.index>=replayState.rows.length-1){pauseReplay();return}replayState.index++;$('replaySlider').value=replayState.index;renderReplayFrame()},650)}
function replayDirectionClass(x){return x==='LONG'||x==='BULLISH'?'good':x==='SHORT'||x==='BEARISH'?'bad':'neutral'}
function drawReplayChart(frame){const cv=$('replayChart');if(!cv||!frame)return;const q=frame.q,ctx=cv.getContext('2d'),dpr=Math.min(2,window.devicePixelRatio||1),w=Math.max(640,Math.floor(cv.clientWidth||1200)),h=Math.max(240,Math.floor(cv.clientHeight||340));if(cv.width!==w*dpr||cv.height!==h*dpr){cv.width=w*dpr;cv.height=h*dpr}ctx.setTransform(dpr,0,0,dpr,0,0);const bars=q.candles.slice(-120),hi=bars.map(x=>+x[2]),lo=bars.map(x=>+x[3]),mn=Math.min(...lo),mx=Math.max(...hi),range=mx-mn||1,pad=32,xx=i=>pad+i*(w-2*pad)/Math.max(1,bars.length-1),yy=v=>pad+(mx-v)/range*(h-2*pad);ctx.clearRect(0,0,w,h);ctx.fillStyle='#07121b';ctx.fillRect(0,0,w,h);ctx.strokeStyle='#17283a';ctx.lineWidth=1;for(let k=0;k<5;k++){const y=pad+k*(h-2*pad)/4;ctx.beginPath();ctx.moveTo(pad,y);ctx.lineTo(w-pad,y);ctx.stroke()}bars.forEach((b,i)=>{const o=+b[1],hh=+b[2],ll=+b[3],c=+b[4],col=c>=o?'#55d89b':'#ff6b78';ctx.strokeStyle=col;ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(xx(i),yy(hh));ctx.lineTo(xx(i),yy(ll));ctx.stroke();const bw=Math.max(2,(w-2*pad)/bars.length*.55),top=Math.min(yy(o),yy(c)),bh=Math.max(1,Math.abs(yy(o)-yy(c)));ctx.fillRect(xx(i)-bw/2,top,bw,bh)});ctx.fillStyle='#9fb1c4';ctx.font='11px system-ui';ctx.fillText(`${replayState.symbol} · ${replayState.tf} · ${new Date(frame.ts).toLocaleString()}`,pad,18)}
async function renderReplayArchiveContext(frame){const token=++replayState.archiveToken,span={"15m":15*60000,"1h":3600000,"4h":4*3600000,"1d":86400000}[replayState.tf]||4*3600000,since=frame.ts-3*span;const [dec,pr,br]=await Promise.all([localDbRecords('decisions',since,1000),localDbRecords('profit_readiness',Math.max(0,frame.ts-14*86400000),1000),localDbRecords('market_breadth_v64',Math.max(0,frame.ts-7*86400000),5000)]);if(token!==replayState.archiveToken)return;const normSym=coin(replayState.symbol),match=dec.map(x=>({ts:x.ts,d:x.data})).filter(x=>x.ts<=frame.ts&&coin(x.d?.symbol||'')===normSym&&(x.d?.tf||replayState.tf)===replayState.tf).sort((a,b)=>b.ts-a.ts)[0],ready=pr.map(x=>({ts:x.ts,d:x.data})).filter(x=>x.ts<=frame.ts&&x.d?.market===replayState.market).sort((a,b)=>b.ts-a.ts)[0],breadth=br.map(x=>({ts:x.ts,d:x.data})).filter(x=>x.ts<=frame.ts&&x.d?.market===replayState.market).sort((a,b)=>b.ts-a.ts)[0];$('replayArchivedMaster').textContent=match?.d?.verdict||match?.d?.master?.verdict||'N/A';$('replayArchivedReadiness').textContent=ready?.d?.state||'N/A';$('replayArchivedBreadth').textContent=breadth?.d&&Number.isFinite(+breadth.d.score)?`${breadth.d.state} · ${(+breadth.d.score).toFixed(0)}/100`:'N/A';$('replayArchiveMatch').textContent=match&&frame.ts-match.ts<=3*span?`MATCH · ${Math.round((frame.ts-match.ts)/60000)}m old`:'NONE';}
function appendReplaySession(frame){const last=replayState.session.at(-1);if(last&&last.ts===frame.ts)return;const rec={ts:frame.ts,market:replayState.market,symbol:replayState.symbol,source:replayState.source,tf:replayState.tf,mode:replayState.mode,direction:frame.direction,score:+frame.q.score,regime:frame.q.regime,adx:+frame.q.adx,rvPercentile:+frame.q.rvPercentile,outcome:frame.outcome};replayState.session.push(rec);if(replayState.session.length>500)replayState.session.shift();const bucket=Math.floor(frame.ts/60000);localDbPutRecord('historical_replay',`${bucket}|${replayState.market}|${replayState.symbol}|${replayState.tf}`,rec,Date.now()).catch(()=>{});renderReplayLog()}
function renderReplayLog(){const box=$('replayLog');if(!box)return;const a=replayState.session.slice(-20).reverse();box.innerHTML=a.length?a.map(x=>`<div class="replayLogRow"><span>${new Date(x.ts).toLocaleString()}</span><b class="${replayDirectionClass(x.direction)}">${x.direction}</b><span>${(+x.score).toFixed(0)}</span><span>${x.outcome&&Number.isFinite(x.outcome.netPct)?`${x.outcome.netPct>=0?'+':''}${x.outcome.netPct.toFixed(2)}% net`:'future unavailable'}</span></div>`).join(''):'<div class="emptyState">No replay frames recorded yet.</div>'}
function renderReplayFrame(){if(!replayState.rows.length)return;replayState.mode=$('replayMode')?.value||replayState.mode;const h=+$('replayHorizon')?.value||12,frame=replayFrame(replayState.rows,replayState.index,replayState.mode,h);if(!frame)return;$('replayTime').textContent=new Date(frame.ts).toLocaleString();$('replayVisible').textContent=`${frame.prefixN}/${replayState.rows.length}`;$('replayVerdict').textContent=frame.direction;$('replayVerdict').className=replayDirectionClass(frame.direction);$('replayScore').textContent=frame.q.score.toFixed(1);$('replayOutcome').textContent=frame.outcome&&Number.isFinite(frame.outcome.netPct)?`${frame.outcome.netPct>=0?'+':''}${frame.outcome.netPct.toFixed(2)}% net / ${h} bars`:'N/A';$('replayNoLookahead').textContent=`ENFORCED · prefix ${frame.prefixN}`;$('replayComponents').innerHTML=[["Trend",frame.q.trendScore],["Momentum",frame.q.momScore],["Volume",frame.q.volScore],["Structure",frame.q.structureScore],["ADX",frame.q.adx],["RV percentile",frame.q.rvPercentile],["Regime",frame.q.regime],["Price",num(frame.q.price)]].map(([a,b])=>`<div class="replayComp"><span>${a}</span><b>${typeof b==='number'?b.toFixed(1):escapeHtml(b)}</b></div>`).join('');drawReplayChart(frame);appendReplaySession(frame);renderReplayArchiveContext(frame).catch(()=>{})}
function replayCsvCell(v){const s=String(v??'');return /[",\n]/.test(s)?`"${s.replaceAll('"','""')}"`:s}
function exportReplaySession(kind='csv'){const rows=replayState.session;if(!rows.length)return toast('No replay frames to export','warn');if(kind==='json')return downloadTextFile(`crypto-radar-v66-replay-${replayState.symbol}-${Date.now()}.json`,JSON.stringify({version:'v66',strictPrefix:true,rows},null,2),'application/json');const cols=['time','market','symbol','source','tf','mode','direction','score','regime','adx','rvPercentile','outcomeRawPct','outcomeNetPct','horizon'],lines=[cols.join(',')];for(const x of rows)lines.push([new Date(x.ts).toISOString(),x.market,x.symbol,x.source,x.tf,x.mode,x.direction,x.score,x.regime,x.adx,x.rvPercentile,x.outcome?.rawPct,x.outcome?.netPct,x.outcome?.horizon].map(replayCsvCell).join(','));downloadTextFile(`crypto-radar-v66-replay-${replayState.symbol}-${Date.now()}.csv`,lines.join('\n'),'text/csv')}
function historicalRankScore(row){const strength=clamp(Math.abs((+row.avg||50)-50)*2),conf=clamp(+row.conf||0),adxQ=clamp((+row.adx||0)/40*100),structure=clamp(+row.structure||50),volume=clamp(+row.volume||50),chop=Number.isFinite(+row.chop)?+row.chop:50,eff=Number.isFinite(+row.efficiency)?+row.efficiency:.3,regimeQ=clamp(55+(String(row.regime||'').includes('TREND')?12:0)+(chop<45?10:chop>62?-15:0)+(eff>.45?10:eff<.2?-10:0));return clamp(.32*strength+.20*conf+.16*adxQ+.12*structure+.10*volume+.10*regimeQ)}
function historicalScannerRow(symbol,rows,anchorTs,horizon,mode,source){const ordered=[...(rows||[])].sort((a,b)=>+a[0]-+b[0]),index=replayLastIndexAtOrBefore(ordered,anchorTs);if(index<REPLAY_MIN_BARS-1||index+horizon>=ordered.length)return null;const prefix=replayPrefix(ordered,index),q=calc(prefix,mode),outcome=replayOutcome(ordered,index,horizon,q.signal),recent=prefix.slice(-6),turnover=areVolLipsa(recent)?null:recent.reduce((a,x)=>a+(+x[4])*(+x[5]||0),0),row={c:symbol,avg:q.score,dir:q.ver,signal:q.signal,conf:q.confluence,adx:q.adx,regime:q.regime,turnover,source,trend:q.trendScore,mom:q.momScore,structure:q.structureScore,volume:q.volScore,chop:q.chop,efficiency:q.efficiency,hurst:q.hurst,rvPercentile:q.rvPercentile,replayTs:+prefix.at(-1)[0],price:q.price,outcomeRawPct:outcome?.rawPct??null,outcomeNetPct:outcome?.netPct??null,hit:outcome?.hit??null};row.histScore=historicalRankScore(row);return row}
function cancelHistoricalScanner(){if(historicalScanToken){historicalScanToken.cancelled=true;$('histScanStatus').textContent='Cancelling…'}}
function renderHistoricalScanner(){const box=$('histScanTable');if(!box)return;const rows=historicalScannerRows.slice(0,50);box.innerHTML=rows.length?`<div class="histScanRow histScanHead"><div class="histScanCell">#</div><div class="histScanCell">Asset</div><div class="histScanCell">Hist score</div><div class="histScanCell">Signal</div><div class="histScanCell">ADX</div><div class="histScanCell">Regime</div><div class="histScanCell">Outcome</div><div class="histScanCell">Hit</div></div>`+rows.map((x,i)=>`<div class="histScanRow"><div class="histScanCell histRank">${i+1}</div><div class="histScanCell"><b>${escapeHtml(x.c)}</b></div><div class="histScanCell">${x.histScore.toFixed(1)}</div><div class="histScanCell ${replayDirectionClass(x.signal)}">${x.signal}</div><div class="histScanCell">${x.adx.toFixed(0)}</div><div class="histScanCell">${escapeHtml(x.regime)}</div><div class="histScanCell ${Number.isFinite(x.outcomeNetPct)?(x.outcomeNetPct>=0?'good':'bad'):''}">${Number.isFinite(x.outcomeNetPct)?`${x.outcomeNetPct>=0?'+':''}${x.outcomeNetPct.toFixed(2)}%`:'N/A'}</div><div class="histScanCell">${x.hit==null?'—':x.hit?'✓':'✕'}</div></div>`).join(''):'<div class="emptyState">No historical scanner results.</div>';const top=historicalScannerRows.slice(0,10),dir=top.filter(x=>x.hit!=null),hit=dir.length?dir.filter(x=>x.hit).length/dir.length:NaN,avg=dir.length?dir.reduce((a,x)=>a+(+x.outcomeNetPct||0),0)/dir.length:NaN;$('histScanTopHit').textContent=Number.isFinite(hit)?(hit*100).toFixed(0)+'%':'—';$('histScanAvg').textContent=Number.isFinite(avg)?`${avg>=0?'+':''}${avg.toFixed(2)}%`:'—'}
async function historicalCryptoRows(universe,anchorTs,horizon,mode,token){const out=[],total=universe.length;let done=0;const worker=async item=>{if(token.cancelled)return null;const rows=await klines(`${String(item.base).toUpperCase()}USDT`,'4h',500);return historicalScannerRow(String(item.base).toUpperCase(),rows,anchorTs,horizon,mode,'BINANCE')};const progress=(d,t,rows)=>{done=d;historicalScannerRows=rows.filter(Boolean).sort((a,b)=>b.histScore-a.histScore);$('histScanProcessed').textContent=`${done}/${total}`;$('histScanProgress').style.width=(100*done/total).toFixed(1)+'%';if(done%8===0||done===total)renderHistoricalScanner()};const run=await runPool(universe,worker,4,progress,token);return run.results.filter(Boolean)}
async function historicalStockRows(universe,anchorTs,horizon,mode,token){const out=[];let done=0,errors=0;for(let i=0;i<universe.length;i+=15){if(token.cancelled)break;const batch=universe.slice(i,i+15);try{const data=await stockBatchSeries(batch,'1d',500);for(const sym of batch){const x=historicalScannerRow(sym,data[sym]?.rows||data[sym]||[],anchorTs,horizon,mode,'TWELVEDATA');if(x)out.push(x);else errors++;done++}}catch{done+=batch.length;errors+=batch.length}historicalScannerRows=[...out].sort((a,b)=>b.histScore-a.histScore);$('histScanProcessed').textContent=`${done}/${universe.length}`;$('histScanProgress').style.width=(100*done/universe.length).toFixed(1)+'%';renderHistoricalScanner()}return out}
async function runHistoricalScanner(){if(!navigator.onLine)return toast('Historical scanner requires network data','warn');if(historicalScanToken)historicalScanToken.cancelled=true;const token={cancelled:false,id:Date.now()};historicalScanToken=token;historicalScannerRows=[];historicalUniverseMeta=null;renderHistoricalScanner();const market=assetClass(),mode=$('replayMode')?.value||$('mode')?.value||'auto',barsAgo=Math.max(5,Math.min(200,+$('histScanBarsAgo')?.value||60)),horizon=Math.max(1,+$('histScanHorizon')?.value||12),depth=$('histScanDepth')?.value||'FAST';$('histScanStatus').textContent='Loading reference timeline…';$('histScanProgress').style.width='0%';try{let ref,anchorTs,universe,rows;if(market==='STOCKS'){const cfg=await stockConfig(true);if(!cfg.configured)throw Error('TWELVE_DATA_API_KEY is not configured');ref=await stockSeries('QQQ','1d',500);if(ref.length<=barsAgo+horizon+REPLAY_MIN_BARS)throw Error('Insufficient QQQ history for selected bars-ago');anchorTs=+ref[ref.length-1-barsAgo][0];historicalUniverseMeta=ndxUniverseAt(anchorTs);universe=depth==='FULL'?historicalUniverseMeta.symbols:ndxFastUniverseAt(historicalUniverseMeta);$('histScanStatus').textContent=`Nasdaq historical scan · ${universe.length}/${historicalUniverseMeta.count} symbols · ${historicalUniverseMeta.coverage} · prefix-only`;rows=await historicalStockRows(universe,anchorTs,horizon,mode,token)}else{ref=await klines('BTCUSDT','4h',500);if(ref.length<=barsAgo+horizon+REPLAY_MIN_BARS)throw Error('Insufficient BTC history for selected bars-ago');anchorTs=+ref[ref.length-1-barsAgo][0];const all=await pionexTop100();universe=(depth==='FULL'?all:all.slice(0,30));historicalUniverseMeta={targetTs:anchorTs,targetDate:new Date(anchorTs).toISOString().slice(0,10),coverage:'CURRENT_MEMBERSHIP',reconstructed:false,count:universe.length,bias:'SURVIVORSHIP_BIAS',source:'Current Pionex membership'};$('histScanStatus').textContent=`Crypto historical scan · current Pionex membership · ${universe.length} coins · Binance prefix-only`;rows=await historicalCryptoRows(universe,anchorTs,horizon,mode,token)}if(token.cancelled){$('histScanStatus').textContent='Historical scan cancelled.';return}historicalScannerRows=[...rows].sort((a,b)=>b.histScore-a.histScore);const histBreadth=v64BreadthFromAnalysisRows(historicalScannerRows,{market,source:market==='STOCKS'?'TWELVEDATA':'BINANCE',total:universe.length,depth,universe:historicalUniverseMeta?.source||'HISTORICAL SCANNER'});$('histBreadthState').textContent=histBreadth.state;$('histBreadthScore').textContent=Number.isFinite(+histBreadth.score)?(+histBreadth.score).toFixed(0)+'/100':'—';$('histBreadthParticipation').textContent=v64Pct(histBreadth.participation);$('histBreadthCoverage').textContent=`${histBreadth.n}/${histBreadth.total}`;localDbPutRecord('market_breadth_v64',`HIST|${market}|${anchorTs}`,{...histBreadth,ts:anchorTs,historical:true},anchorTs).catch(()=>{});$('histScanAnchor').textContent=new Date(anchorTs).toLocaleString();$('histScanProcessed').textContent=`${rows.length}/${universe.length}`;$('histScanProgress').style.width='100%';if($('histUniverseMode'))$('histUniverseMode').textContent=historicalUniverseMeta?.coverage||'—';if($('histUniverseDate'))$('histUniverseDate').textContent=historicalUniverseMeta?.targetDate||'—';if($('histUniverseEvents'))$('histUniverseEvents').textContent=String(historicalUniverseMeta?.eventsReversed??0);if($('histUniverseBias'))$('histUniverseBias').textContent=historicalUniverseMeta?.bias||'—';renderHistoricalScanner();const top=historicalScannerRows.slice(0,10),payload={ts:Date.now(),anchorTs,market,mode,depth,horizon,barsAgo,source:market==='STOCKS'?'TWELVEDATA':'BINANCE',universeSource:historicalUniverseMeta?.source||'Unknown',universeMeta:historicalUniverseMeta,strictPrefix:true,survivorshipBias:historicalUniverseMeta?.bias!=='REDUCED_NOT_ELIMINATED',membershipBias:historicalUniverseMeta?.bias||'UNKNOWN',breadth:histBreadth,rows:historicalScannerRows.slice(0,120),top10:top};await localDbPutRecord('historical_scans',`${anchorTs}|${market}|${depth}|${horizon}`,payload,Date.now());$('histScanStatus').textContent=`Complete · ${rows.length}/${universe.length} · ${historicalUniverseMeta?.coverage||'membership'} · no-lookahead`;toast('Historical scan complete','good')}catch(e){$('histScanStatus').textContent='Historical scan failed · '+e.message;toast(e.message,'bad')}finally{if(historicalScanToken===token)historicalScanToken=null}}
function exportHistoricalScan(kind='csv'){const rows=historicalScannerRows;if(!rows.length)return toast('Run a historical scan first','warn');if(kind==='json')return downloadTextFile(`crypto-radar-v66-historical-scan-${Date.now()}.json`,JSON.stringify({version:'v66',strictPrefix:true,universeMeta:historicalUniverseMeta,membershipBias:historicalUniverseMeta?.bias||'UNKNOWN',rows},null,2),'application/json');const cols=['rank','symbol','histScore','signal','bias','score','confidence','adx','regime','replayTime','price','outcomeRawPct','outcomeNetPct','hit','universeCoverage'],lines=[cols.join(',')];rows.forEach((x,i)=>lines.push([i+1,x.c,x.histScore,x.signal,x.dir,x.avg,x.conf,x.adx,x.regime,new Date(x.replayTs).toISOString(),x.price,x.outcomeRawPct,x.outcomeNetPct,x.hit,historicalUniverseMeta?.coverage||'UNKNOWN'].map(replayCsvCell).join(',')));downloadTextFile(`crypto-radar-v66-historical-scan-${Date.now()}.csv`,lines.join('\n'),'text/csv')}


// v60 · Edge Validation & Shadow Execution Pro
const V60_SHADOW_KEY="shadowLiveV60",V60_ALERT_KEY="alertProV60";
function v60Clamp(x,a=0,b=100){return Math.max(a,Math.min(b,+x||0))}
function v60StoreGet(key,fallback){try{const s=appSettings().privacySessionOnly?sessionStorage:localStorage;const v=s.getItem(key);return v==null?fallback:JSON.parse(v)}catch{return fallback}}
function v60StoreSet(key,val){try{const s=appSettings().privacySessionOnly?sessionStorage:localStorage;s.setItem(key,JSON.stringify(val));return true}catch{return false}}
function v60Vals(rows){return (rows||[]).map(metricR).filter(Number.isFinite)}
function v60MeanSd(vals){if(!vals.length)return {mean:NaN,sd:NaN};const mean=vals.reduce((a,b)=>a+b,0)/vals.length,sd=Math.sqrt(vals.reduce((a,b)=>a+(b-mean)**2,0)/Math.max(1,vals.length-1));return {mean,sd}}
function v60Ci95(vals){const {mean,sd}=v60MeanSd(vals);if(vals.length<3||!Number.isFinite(sd))return [NaN,NaN];const m=1.96*sd/Math.sqrt(vals.length);return [mean-m,mean+m]}
function v60RollingStability(vals,w=10){if(vals.length<w)return {score:NaN,positive:NaN,windows:0,drift:NaN};const av=[];for(let i=w;i<=vals.length;i+=Math.max(1,Math.floor(w/2)))av.push(vals.slice(i-w,i).reduce((a,b)=>a+b,0)/w);if(av.at(-1)!==vals.slice(-w).reduce((a,b)=>a+b,0)/w)av.push(vals.slice(-w).reduce((a,b)=>a+b,0)/w);const pos=av.filter(x=>x>0).length/av.length,m=v60MeanSd(av),drift=Math.abs(av.at(-1)-(av[0]||0)),score=v60Clamp(pos*100-Math.min(45,(Number.isFinite(m.sd)?m.sd:0)*20)-Math.min(25,drift*12));return {score,positive:pos,windows:av.length,drift}}
function v60ResolvedCurrent(){const src=analysisSource(),market=assetClass();return chronologicalRows(researchJournalRows().filter(x=>Number.isFinite(metricR(x))&&(x.source||"BINANCE")===src&&prMarketOf(x)===market))}
function v60ForwardEvidence(){const start=forwardStart(),rows=start?v60ResolvedCurrent().filter(x=>(+x.ts||0)>=start):[],vals=v60Vals(rows),st=statPack(vals),ci=v60Ci95(vals),stability=v60RollingStability(vals,Math.max(8,Math.min(20,Math.floor(vals.length/3)||10)));return {start,rows,vals,st,ci,stability}}
function v60SegmentEvidence(rows){const st=window.__radarState,ss=window.__signalState;if(!st)return {n:0,avg:NaN,pf:NaN};const rg=st.q?.regime,dir=ss?.tm?.direction;const z=(rows||[]).filter(x=>x.symbol===st.symbol&&x.tf===st.tf&&(!rg||x.regime===rg)&&(!dir||dir==="WAIT"||x.direction===dir)),s=statPack(v60Vals(z));return {...s,rows:z}}
function v60PerfRows(dim){const rows=v60ResolvedCurrent(),g=new Map();for(const x of rows){let k;if(dim==="symbol")k=coin(x.symbol);else if(dim==="tf")k=x.tf;else if(dim==="regime")k=x.regime||"UNKNOWN";else if(dim==="direction")k=x.direction||"?";else if(dim==="session")k=x.session||"UNKNOWN";else if(dim==="volatility"){const a=+x.atrPct;k=!Number.isFinite(a)?"UNKNOWN":a<1?"LOW ATR%":a<2.5?"NORMAL ATR%":"HIGH ATR%"}else if(dim==="setup")k=`${x.mode||"auto"} · ${x.direction||"?"} · ${x.regime||"UNKNOWN"}`;else k=x.mode||"auto";if(!g.has(k))g.set(k,[]);g.get(k).push(metricR(x))}return [...g].map(([key,vals])=>({key,...statPack(vals)})).sort((a,b)=>b.n-a.n||b.avg-a.avg)}
function v60RenderPerformance(){const box=$("epPerfTable");if(!box)return;const dim=$("epPerfDim")?.value||"symbol",rows=v60PerfRows(dim);box.innerHTML=rows.length?`<div class="edgeProRow head"><div class="edgeProCell">${escapeHtml(dim)}</div><div class="edgeProCell">N</div><div class="edgeProCell">Win%</div><div class="edgeProCell">Exp R</div><div class="edgeProCell">PF</div><div class="edgeProCell">Max DD</div></div>`+rows.slice(0,24).map(x=>`<div class="edgeProRow"><div class="edgeProCell"><b>${escapeHtml(String(x.key))}</b></div><div class="edgeProCell">${x.n}</div><div class="edgeProCell">${(x.win*100).toFixed(1)}%</div><div class="edgeProCell ${x.avg>=0?'edgeProGood':'edgeProBad'}">${x.avg.toFixed(2)}</div><div class="edgeProCell">${x.pf.toFixed(2)}</div><div class="edgeProCell">${x.dd.toFixed(2)}</div></div>`).join(""):'<div class="emptyState">Need resolved outcomes for this market/source.</div>'}
function alertProSettings(){return {...{enabled:false,minScore:68,minQuality:75,requireReady:false},...v60StoreGet(V60_ALERT_KEY,{})}}
function saveAlertProSettings(){const x={enabled:!!$("epAlertEnable")?.checked,minScore:Math.max(50,Math.min(100,+$("epAlertScore")?.value||68)),minQuality:Math.max(0,Math.min(100,+$("epAlertQuality")?.value||75)),requireReady:!!$("epAlertReady")?.checked};v60StoreSet(V60_ALERT_KEY,x);renderAlertProState();return x}
function renderAlertProState(){const x=alertProSettings();if($("epAlertEnable"))$("epAlertEnable").checked=x.enabled;if($("epAlertScore"))$("epAlertScore").value=x.minScore;if($("epAlertQuality"))$("epAlertQuality").value=x.minQuality;if($("epAlertReady"))$("epAlertReady").checked=x.requireReady;const mv=window.__masterVerdict,guard=typeof riskGuard==="function"?riskGuard():{state:"N/A"},governor=typeof v61RiskGovernor==="function"?v61RiskGovernor():{state:guard.state,mult:guard.state==="PAUSE"?0:1},ready=window.__profitReadiness||null,quality=mv?.quality,kill=typeof v65KillSwitch==="function"?v65KillSwitch():{state:"NORMAL"},ok=!!(x.enabled&&mv&&mv.verdict!=="WAIT"&&(+mv.score||0)>=x.minScore&&Number.isFinite(+quality)&&+quality>=x.minQuality&&guard.state!=="PAUSE"&&governor.mult>0&&kill.state!=="NO NEW TRADES"&&(!x.requireReady||ready?.state!=="NOT READY"));if($("epAlertState")){$("epAlertState").textContent=!x.enabled?"DISABLED":ok?`ARMED · PASSES · GOV ${governor.mult.toFixed(2)}×`:`ARMED · WAITING · GOV ${governor.mult.toFixed(2)}×`;$("epAlertState").className=ok?"good":"neutral"}return {ok,x,mv,guard,governor,ready}}
function checkAlertsPro(){const g=renderAlertProState();if(!g.ok)return false;const st=window.__radarState,ss=window.__signalState;if(!st||!ss||ss.tm.direction==="WAIT")return false;addAlert("pro-setup",`PRO ${ss.tm.direction} · ${coin(st.symbol)}`,`Verdict ${(+g.mv.score||0).toFixed(0)}/100 · quality ${(+g.mv.quality||0).toFixed(0)}/100 · guard ${g.guard.state}`,"good");return true}
function renderEdgePro(){const f=v60ForwardEvidence(),seg=v60SegmentEvidence(f.rows);if($("epForwardN"))$("epForwardN").textContent=f.st.n;if($("epForwardExp"))$("epForwardExp").textContent=f.st.n?f.st.avg.toFixed(2)+" R":"—";if($("epForwardCI"))$("epForwardCI").textContent=Number.isFinite(f.ci[0])?`${f.ci[0].toFixed(2)}…${f.ci[1].toFixed(2)} R`:"—";if($("epForwardStability"))$("epForwardStability").textContent=Number.isFinite(f.stability.score)?f.stability.score.toFixed(0)+"/100":"—";if($("epSegment"))$("epSegment").textContent=seg.n?`N${seg.n} · ${seg.avg.toFixed(2)}R`:"N0";if($("epForwardNote"))$("epForwardNote").textContent=!f.start?"Start Forward Validation first.":f.st.n<20?"Collecting forward-only outcomes; N<20 is too small for strong inference.":`Positive rolling windows ${(f.stability.positive*100).toFixed(0)}% · drift ${f.stability.drift.toFixed(2)}R.`;v60RenderPerformance();renderV61Governance();renderAlertProState();renderShadowLive();renderTradeReviews();renderV63LiveExecution();return f}
function v60Median(a){if(!a.length)return NaN;const z=[...a].sort((x,y)=>x-y),m=Math.floor(z.length/2);return z.length%2?z[m]:(z[m-1]+z[m])/2}
async function runWalkForwardOptimizer(){const status=$("epWfStatus"),sym=norm($("symbol").value),tf=$("tf").value,mode=$("mode").value,src=analysisSource(),cfg=appSettings(),folds=Math.max(3,Math.min(5,+$("epWfFolds")?.value||5));if(status)status.textContent=`Loading history · ${src}…`;try{const j=(window.__radarState&&window.__radarState.symbol===sym&&window.__radarState.tf===tf&&window.__radarState.source===src&&window.__radarState.j?.length>=700)?window.__radarState.j:await analysisKlines(sym,tf,1000,src),horizon=mode==="scalp"?4:mode==="swing"?12:6,points=[];for(let i=240;i<j.length-horizon-1;i+=horizon){const q=calc(j.slice(0,i+1),mode);points.push({score:q.score,atr:q.atr,entry:+j[i+1][1],future:j.slice(i+1,i+1+horizon)})}if(points.length<45)throw Error("Insufficient walk-forward points");const initial=Math.max(30,Math.floor(points.length*.45)),chunk=Math.max(5,Math.floor((points.length-initial)/folds)),thresholds=[60,64,68,72],stops=[1.25,1.5,1.75,2],targets=[1.5,2,2.5],out=[],all=[];for(let f=0;f<folds;f++){const trainEnd=Math.min(points.length-1,initial+f*chunk),testEnd=f===folds-1?points.length:Math.min(points.length,trainEnd+chunk);if(testEnd<=trainEnd)break;let best=null;for(const threshold of thresholds)for(const stopMult of stops)for(const targetR of targets){const par={threshold,stopMult,targetR,costMult:1},vals=paramWfTrade(points,par,cfg,0,trainEnd),st=statsR(vals);if(st.n<10)continue;const utility=st.avg-Math.abs(st.dd)*.012+Math.min(.08,st.n/1000)-Math.max(0,targetR-2.5)*.02;if(!best||utility>best.utility)best={par,utility,...st}}if(!best){const par={threshold:64,stopMult:1.5,targetR:2,costMult:1};best={par,...statsR(paramWfTrade(points,par,cfg,0,trainEnd))}}const vals=paramWfTrade(points,best.par,cfg,trainEnd,testEnd),o=statsR(vals);all.push(...vals);out.push({fold:f+1,trainN:trainEnd,testPoints:testEnd-trainEnd,par:best.par,train:best,oos:o})}const agg=statsR(all),ths=out.map(x=>x.par.threshold),stopsSel=out.map(x=>x.par.stopMult),targetsSel=out.map(x=>x.par.targetR),mTh=v60MeanSd(ths),mStop=v60MeanSd(stopsSel),mTarget=v60MeanSd(targetsSel),pos=out.filter(x=>x.oos.n&&x.oos.avg>0).length/Math.max(1,out.length),stability=v60Clamp(100-(Number.isFinite(mTh.sd)?mTh.sd*7:35)-(Number.isFinite(mStop.sd)?mStop.sd*25:20)-(Number.isFinite(mTarget.sd)?mTarget.sd*18:20)-(1-pos)*30),medTh=v60Median(ths),medStop=v60Median(stopsSel),medTarget=v60Median(targetsSel);$("epWfThreshold").textContent=Number.isFinite(medTh)?`${medTh.toFixed(0)} · ${medStop.toFixed(2)}ATR · ${medTarget.toFixed(1)}R`:"—";$("epWfOosN").textContent=agg.n;$("epWfOosExp").textContent=agg.n?agg.avg.toFixed(2)+" R":"—";$("epWfPf").textContent=agg.n?agg.pf.toFixed(2):"—";$("epWfDd").textContent=agg.n?agg.dd.toFixed(2)+" R":"—";$("epWfStability").textContent=stability.toFixed(0)+"/100";$("epWfTable").innerHTML=`<div class="edgeProRow head"><div class="edgeProCell">Fold</div><div class="edgeProCell">Params</div><div class="edgeProCell">Train N/Exp</div><div class="edgeProCell">OOS N</div><div class="edgeProCell">OOS Exp</div><div class="edgeProCell">OOS PF</div></div>`+out.map(x=>`<div class="edgeProRow"><div class="edgeProCell">${x.fold}</div><div class="edgeProCell">T${x.par.threshold} · S${x.par.stopMult.toFixed(2)} · R${x.par.targetR.toFixed(1)}</div><div class="edgeProCell">${x.train.n} / ${x.train.avg.toFixed(2)}</div><div class="edgeProCell">${x.oos.n}</div><div class="edgeProCell ${x.oos.avg>=0?'edgeProGood':'edgeProBad'}">${x.oos.n?x.oos.avg.toFixed(2):'—'}</div><div class="edgeProCell">${x.oos.n?x.oos.pf.toFixed(2):'—'}</div></div>`).join("");if(status)status.textContent=`Anchored ${out.length}-fold walk-forward · ${(pos*100).toFixed(0)}% positive OOS folds · parameter stability ${stability.toFixed(0)}/100.`;const row={ts:Date.now(),market:assetClass(),source:src,symbol:sym,tf,mode,n:agg.n,avg:agg.avg,pf:agg.pf,dd:agg.dd,threshold:medTh,stopMult:medStop,targetR:medTarget,folds:out,stability,pass:agg.n>=20&&agg.avg>0&&agg.pf>=1.2&&pos>=.6&&stability>=55};saveProfitReadinessOos(row);localDbPutRecord("walk_forward_v60",`${assetClass()}|${src}|${sym}|${tf}|${mode}`,row,row.ts).catch(()=>{});renderProfitReadiness(false);return row}catch(e){if(status)status.textContent="Walk-forward optimizer unavailable: "+e.message;toast(e.message,"bad");return null}}
function v60Rng(seed=60060){let s=seed>>>0;return ()=>((s=(1664525*s+1013904223)>>>0)/4294967296)}
function v60BlockSequence(vals,n,rng,block=5){const out=[];while(out.length<n){let i=Math.floor(rng()*vals.length);for(let k=0;k<block&&out.length<n;k++)out.push(vals[(i+k)%vals.length])}return out}
async function runRiskOfRuinPro(){const f=v60ForwardEvidence(),fallback=v60Vals(v60ResolvedCurrent()),vals=f.vals.length>=20?f.vals:fallback;if(vals.length<20){toast("Need at least 20 resolved outcomes","warn");return null}const runs=Math.max(500,Math.min(20000,+$("epMcRuns")?.value||3000)),trades=Math.max(20,Math.min(1000,+$("epMcTrades")?.value||150)),risk=Math.max(.001,Math.min(.05,(+$("epRiskPct")?.value||1)/100)),floor=Math.max(.2,Math.min(.95,(+$("epRuinFloor")?.value||70)/100)),rng=v60Rng((vals.length*9973+trades*37+runs)>>>0);let ruin=0,dd10=0,dd20=0,lossEnd=0;const dds=[],streaks=[];for(let q=0;q<runs;q++){const seq=v60BlockSequence(vals,trades,rng,5);let eq=1,peak=1,maxDd=0,ls=0,maxLs=0,hitRuin=false;for(const r of seq){ls=r<0?ls+1:0;maxLs=Math.max(maxLs,ls);eq=Math.max(.000001,eq*(1+r*risk));peak=Math.max(peak,eq);maxDd=Math.max(maxDd,(peak-eq)/peak);if(eq<=floor)hitRuin=true}if(hitRuin)ruin++;if(maxDd>=.10)dd10++;if(maxDd>=.20)dd20++;if(eq<1)lossEnd++;dds.push(maxDd);streaks.push(maxLs)}const p=x=>(100*x/runs).toFixed(1)+"%",worst=percentile(dds,.95),ls95=percentile(streaks,.95);$("epMcRuin").textContent=p(ruin);$("epMcDd10").textContent=p(dd10);$("epMcDd20").textContent=p(dd20);$("epMcWorstDd").textContent=(worst*100).toFixed(1)+"%";$("epMcLossStreak").textContent=Math.ceil(ls95)+" trades";$("epMcLossEnd").textContent=p(lossEnd);$("epMcNote").textContent=`${runs.toLocaleString()} block-bootstrap paths · ${trades} trades · risk ${(risk*100).toFixed(1)}%/trade · ruin floor ${(floor*100).toFixed(0)}%. Source: ${f.vals.length>=20?'forward cohort':'full resolved sample'}; not a forecast.`;const row={ts:Date.now(),runs,trades,risk,floor,ruin:ruin/runs,dd10:dd10/runs,dd20:dd20/runs,p95dd:worst,p95LossStreak:ls95,lossEnd:lossEnd/runs,n:vals.length};localDbPutRecord("risk_ruin_v60",`${assetClass()}|${analysisSource()}|${Date.now()}`,row,row.ts).catch(()=>{});return row}
function v60BookVwap(levels,notional){let rem=Math.max(0,notional),base=0,quote=0;for(const z of levels||[]){const p=+z[0],q=+z[1],cap=p*q,take=Math.min(rem,cap);if(!(p>0&&take>0))continue;base+=take/p;quote+=take;rem-=take;if(rem<=1e-9)break}return {vwap:base?quote/base:NaN,filled:quote,fillRatio:notional?quote/notional:0}}
async function refreshExecutionPro(){const sym=norm($("symbol").value),notional=Math.max(50,+$("epExecNotional")?.value||1000),t0=performance.now();if(assetClass()!=="CRYPTO"){window.__executionProV60={ts:Date.now(),market:"STOCKS",mode:"MODELED",buySlipBps:+appSettings().slippageBps||0,sellSlipBps:+appSettings().slippageBps||0,latencyMs:performance.now()-t0};$("epExecStatus").textContent="MODELED · no consolidated depth";$("epExecSpread").textContent=$("epExecImb").textContent=$("epExecTapeDelta").textContent=$("epExecLiquidity").textContent="N/A";$("epExecBuySlip").textContent=$("epExecSellSlip").textContent=(+appSettings().slippageBps||0).toFixed(1)+" bps";return window.__executionProV60}try{const d=await market(`/depth?symbol=${encodeURIComponent(sym)}&limit=100`),bids=d.bids||[],asks=d.asks||[],bestBid=+bids[0]?.[0],bestAsk=+asks[0]?.[0],mid=(bestBid+bestAsk)/2,spread=mid?(bestAsk-bestBid)/mid*10000:NaN,bq=bids.slice(0,10).reduce((z,x)=>z+(+x[0])*(+x[1]),0),aq=asks.slice(0,10).reduce((z,x)=>z+(+x[0])*(+x[1]),0),imb=(bq+aq)?(bq-aq)/(bq+aq)*100:0,buy=v60BookVwap(asks,notional),sell=v60BookVwap(bids,notional),buySlip=Number.isFinite(buy.vwap)&&bestAsk?(buy.vwap/bestAsk-1)*10000:NaN,sellSlip=Number.isFinite(sell.vwap)&&bestBid?(bestBid-sell.vwap)/bestBid*10000:NaN;await loadTrueTradeFlow(true).catch(()=>{});const tape=trueFlowState&&Number.isFinite(trueFlowState.delta)?trueFlowState.delta:NaN,visible=bids.reduce((z,x)=>z+(+x[0])*(+x[1]),0)+asks.reduce((z,x)=>z+(+x[0])*(+x[1]),0),row={ts:Date.now(),market:"CRYPTO",symbol:sym,notional,spreadBps:spread,imb10:imb,buySlipBps:buySlip,sellSlipBps:sellSlip,buyFill:buy.fillRatio,sellFill:sell.fillRatio,tapeDelta:tape,visibleLiquidity:visible,latencyMs:performance.now()-t0};window.__executionProV60=row;$("epExecStatus").textContent=buy.fillRatio>=.999&&sell.fillRatio>=.999?"FULL VISIBLE FILL":"PARTIAL VISIBLE DEPTH";$("epExecSpread").textContent=Number.isFinite(spread)?spread.toFixed(2)+" bps":"—";$("epExecImb").textContent=(imb>=0?"+":"")+imb.toFixed(1)+"%";$("epExecBuySlip").textContent=Number.isFinite(buySlip)?buySlip.toFixed(2)+" bps":"—";$("epExecSellSlip").textContent=Number.isFinite(sellSlip)?sellSlip.toFixed(2)+" bps":"—";$("epExecTapeDelta").textContent=Number.isFinite(tape)?(tape>=0?"+":"")+tape.toFixed(1)+"%":"—";$("epExecLiquidity").textContent=compact(visible);localDbPutRecord("execution_v60",`${sym}|${Math.floor(row.ts/60000)}`,row,row.ts).catch(()=>{});return row}catch(e){$("epExecStatus").textContent="UNAVAILABLE · "+e.message;return null}}
function shadowTradesV60(){return v60StoreGet(V60_SHADOW_KEY,[])}
function setShadowTradesV60(a){v60StoreSet(V60_SHADOW_KEY,(a||[]).slice(0,200));renderShadowLive()}
async function addShadowSetup(){const st=window.__radarState,ss=window.__signalState;if(!st||!ss||ss.tm.direction==="WAIT"){toast("Run an active LONG/SHORT setup first","warn");return null}if(typeof v67EntryAllowed==="function"&&!v67EntryAllowed("SHADOW",ss.tm.direction))return null;const v67fp=typeof v67CurrentFingerprint==="function"?v67CurrentFingerprint(ss.tm.direction):"";const key=`${st.source}|${st.symbol}|${st.tf}|${+st.j?.at(-1)?.[0]||0}|${ss.tm.direction}`,a=shadowTradesV60();if(a.some(x=>x.key===key)){toast("Current candle/setup is already shadowed","warn");return null}let ex=window.__executionProV60;if(!ex||Date.now()-(+ex.ts||0)>30000||ex.symbol!==st.symbol)ex=await refreshExecutionPro().catch(()=>null);const t0=performance.now(),tk=await analysisTicker(st.symbol,st.source||analysisSource()),last=+(tk.lastPrice||st.q.price),dir=ss.tm.direction,slip=dir==="LONG"?+ex?.buySlipBps:+ex?.sellSlipBps;if(!Number.isFinite(slip))slip=+appSettings().slippageBps||0;const actual=paperAdversePrice(last,dir==="LONG"?"BUY":"SELL",slip),risk=Math.max(1e-12,Math.abs(actual-(+ss.tm.stop))),row={id:Date.now(),key,created:Date.now(),entryBarTs:+st.j?.at(-1)?.[0]||Date.now(),market:assetClass(),source:st.source||analysisSource(),symbol:st.symbol,tf:st.tf,mode:st.mode,direction:dir,plannedEntry:(ss.tm.entryLow+ss.tm.entryHigh)/2,entryReference:last,actualEntry:actual,entrySlipBps:slip,modeledSlipBps:slip,stop:+ss.tm.stop,tp1:+ss.tm.tp1,tp2:+ss.tm.tp2,tp3:+ss.tm.tp3,riskPerUnit:risk,maxBars:signalOutcomeHorizonBars(st.mode)*2,barsSeen:0,lastProcessedTs:0,status:"ACTIVE",mfeR:0,maeR:0,confidence:Math.max(ss.sm.long,ss.sm.short),masterScore:+window.__masterVerdict?.score||NaN,dataQuality:+window.__masterVerdict?.quality||NaN,entryLatencyMs:performance.now()-t0,v63CostInput:v63CostInputSnapshot(dir)};a.unshift(row);setShadowTradesV60(a);if(typeof v67MarkSignal==="function")v67MarkSignal("SHADOW",v67fp);if(typeof v67RecoverySnapshot==="function")v67RecoverySnapshot();localDbPutRecord("shadow_live_v60",String(row.id),row,row.created).catch(()=>{});toast("Shadow setup added · no live order sent","good");return row}
function v60ShadowProcess(t,bar){if(t.status!=="ACTIVE")return;const o=+bar[1],h=+bar[2],l=+bar[3],c=+bar[4],dir=t.direction==="LONG"?1:-1,risk=Math.max(1e-12,+t.riskPerUnit||Math.abs(t.actualEntry-t.stop));t.barsSeen=(+t.barsSeen||0)+1;t.mfeR=Math.max(+t.mfeR||0,(dir>0?h-t.actualEntry:t.actualEntry-l)/risk);t.maeR=Math.max(+t.maeR||0,(dir>0?t.actualEntry-l:h-t.actualEntry)/risk);const sh=dir>0?l<=t.stop:h>=t.stop,th=dir>0?h>=t.tp3:l<=t.tp3;if(sh&&th){t.status="STOP";t.exit=t.stop;t.ambiguity=true}else if(sh){t.status="STOP";t.exit=(dir>0&&o<t.stop)||(dir<0&&o>t.stop)?o:t.stop}else if(th){t.status="TP3";t.exit=t.tp3}else{if(!t.hitTp1&&(dir>0?h>=t.tp1:l<=t.tp1))t.hitTp1=true;if(!t.hitTp2&&(dir>0?h>=t.tp2:l<=t.tp2))t.hitTp2=true;if(t.barsSeen>=t.maxBars){t.status="TIME";t.exit=c}}if(t.status!=="ACTIVE"){const costR=(2*(+appSettings().feeBps||0)/10000)/Math.max(1e-12,risk/t.actualEntry),closedTs=+bar[0]||Date.now(),holdingHours=Math.max(0,(closedTs-(+t.created||closedTs))/3600000),carryR=v63TradeCarryCostR(t,holdingHours);t.baseNetR=dir*((+t.exit)-t.actualEntry)/risk-costR;t.carryCostR=carryR;t.netR=t.baseNetR-carryR;t.closedTs=closedTs}}
async function refreshShadowLive(force=true){const a=shadowTradesV60(),active=a.filter(x=>x.status==="ACTIVE").slice(0,12);for(const t of active){const t0=performance.now();try{const rows=await analysisKlines(t.symbol,t.tf||"4h",250,t.source||"BINANCE"),fresh=rows.filter(b=>(+b[0])>Math.max(+t.lastProcessedTs||0,+t.entryBarTs||0));if(!Number.isFinite(+t.proxyEntry)&&fresh.length&&Number.isFinite(+t.entryReference)&&+t.entryReference>0){t.proxyEntry=+fresh[0][1];const s=t.direction==="LONG"?1:-1;t.proxySlipBps=s*(t.proxyEntry-(+t.entryReference))/(+t.entryReference)*10000;t.executionGapBps=t.proxySlipBps-(+t.modeledSlipBps||0);t.proxyTs=+fresh[0][0];t.proxyKind="NEXT_BAR_OPEN_PROXY"}for(const b of fresh){v60ShadowProcess(t,b);t.lastProcessedTs=+b[0];if(t.status!=="ACTIVE")break}t.fetchLatencyMs=performance.now()-t0;if(t.status==="ACTIVE"&&rows.length){const c=+rows.at(-1)[4],dir=t.direction==="LONG"?1:-1;t.markR=dir*(c-t.actualEntry)/Math.max(1e-12,t.riskPerUnit)}}catch(e){t.lastError=e.message}}setShadowTradesV60(a);for(const t of a.filter(x=>x.closedTs&&Date.now()-x.closedTs<60000))localDbPutRecord("shadow_live_v60",String(t.id),t,t.closedTs).catch(()=>{});return a}
function clearClosedShadow(){setShadowTradesV60(shadowTradesV60().filter(x=>x.status==="ACTIVE"));toast("Closed shadow rows cleared","warn")}
function renderShadowLive(){const a=shadowTradesV60(),closed=a.filter(x=>Number.isFinite(+x.netR)),active=a.filter(x=>x.status==="ACTIVE"),avg=closed.length?closed.reduce((z,x)=>z+(+x.netR||0),0)/closed.length:NaN,sl=a.filter(x=>Number.isFinite(+x.entrySlipBps)),lat=a.filter(x=>Number.isFinite(+x.fetchLatencyMs));if($("epShadowActive"))$("epShadowActive").textContent=active.length;if($("epShadowClosed"))$("epShadowClosed").textContent=closed.length;if($("epShadowExp"))$("epShadowExp").textContent=Number.isFinite(avg)?avg.toFixed(2)+" R":"—";if($("epShadowSlippage"))$("epShadowSlippage").textContent=sl.length?(sl.reduce((z,x)=>z+x.entrySlipBps,0)/sl.length).toFixed(2)+" bps":"—";if($("epShadowLatency"))$("epShadowLatency").textContent=lat.length?(lat.reduce((z,x)=>z+x.fetchLatencyMs,0)/lat.length).toFixed(0)+" ms":"—";const box=$("epShadowTable");if(box)box.innerHTML=a.length?`<div class="edgeProRow shadow head"><div class="edgeProCell">Setup</div><div class="edgeProCell">Dir</div><div class="edgeProCell">Entry</div><div class="edgeProCell">State</div><div class="edgeProCell">R</div><div class="edgeProCell">MFE/MAE</div><div class="edgeProCell">Created</div></div>`+a.slice(0,40).map(x=>`<div class="edgeProRow shadow"><div class="edgeProCell"><b>${escapeHtml(coin(x.symbol))}</b> · ${escapeHtml(x.tf||'')}</div><div class="edgeProCell">${x.direction}</div><div class="edgeProCell">${num(+x.actualEntry||0)}</div><div class="edgeProCell">${x.status}</div><div class="edgeProCell ${(+x.netR||+x.markR||0)>=0?'edgeProGood':'edgeProBad'}">${Number.isFinite(+x.netR)?(+x.netR).toFixed(2):Number.isFinite(+x.markR)?(+x.markR).toFixed(2)+'*':'—'}</div><div class="edgeProCell">${(+x.mfeR||0).toFixed(2)} / ${(+(x.maeR||0)).toFixed(2)}</div><div class="edgeProCell">${new Date(+x.created||0).toLocaleString()}</div></div>`).join(""):'<div class="emptyState">No shadow setups yet.</div>'}
function v60ReviewTrade(x){const r=metricR(x),conf=Math.max(+x.longConf||0,+x.shortConf||0),dir=x.direction,trendAlign=dir==="LONG"?(+x.trendScore||50)>=55:(+x.trendScore||50)<=45,mtfAlign=dir==="LONG"?(+x.mtf||50)>=55:(+x.mtf||50)<=45,positives=[],issues=[];if(trendAlign)positives.push("trend aligned");else issues.push("trend conflict");if(mtfAlign)positives.push("MTF aligned");else issues.push("MTF conflict");if(Number.isFinite(+x.microDeltaPct)){const ok=dir==="LONG"?+x.microDeltaPct>0:+x.microDeltaPct<0;(ok?positives:issues).push(ok?"trade-flow confirmed":"trade-flow opposed")}if((+x.newsRisk||0)>=70)issues.push("high news risk");if(Number.isFinite(+x.costR)&&+x.costR>.20)issues.push("cost drag >0.20R");if(Number.isFinite(+x.breadthScore)){const ba=Number.isFinite(+x.breadthAlignment)?+x.breadthAlignment:(dir==="LONG"?(+x.breadthScore-50)/50:(50-+x.breadthScore)/50);if(ba>=.25)positives.push(`breadth ${x.breadthState||"aligned"}`);else if(ba<=-.25)issues.push(`breadth opposed ${(+x.breadthScore).toFixed(0)}/100`);if(x.breadthDivergence&&x.breadthDivergence!=="NONE")issues.push(String(x.breadthDivergence).toLowerCase())}if(conf>=75)positives.push("high setup confidence");const outcome=!Number.isFinite(r)?"UNRESOLVED":r>0?"POSITIVE":"NEGATIVE",processScore=v60Clamp(55+(trendAlign?10:-10)+(mtfAlign?10:-10)+(issues.length? -5*issues.length:5)),grade=processScore>=80?"A":processScore>=65?"B":processScore>=50?"C":"D",diagnosis=`${outcome} ${Number.isFinite(r)?r.toFixed(2)+'R':''} · ${positives.join(', ')||'no strong confirmations'}${issues.length?' · issues: '+issues.join(', '):''}`;return {ts:Date.now(),grade,processScore,diagnosis,positives,issues}}
function generateTradeReviews(){const a=journal();let n=0;for(const x of a){if(!Number.isFinite(metricR(x)))continue;x.reviewV60=v60ReviewTrade(x);n++}setJournal(a);Promise.all(a.filter(x=>x.reviewV60).slice(0,100).map(x=>persistSignalHistory(x))).catch(()=>{});renderTradeReviews();toast(`Trade reviews generated · ${n}`,"good");return n}
function v60AutoReviewResolved(){const a=journal();let changed=0;for(const x of a.slice(0,80)){if(Number.isFinite(metricR(x))&&!x.reviewV60){x.reviewV60=v60ReviewTrade(x);changed++}}if(changed)setJournal(a);return changed}
function renderTradeReviews(){const box=$("epReviewTable");if(!box)return;const rows=researchJournalRows().filter(x=>Number.isFinite(metricR(x))).slice(0,30);box.innerHTML=rows.length?`<div class="edgeProRow review head"><div class="edgeProCell">Trade</div><div class="edgeProCell">R</div><div class="edgeProCell">Review</div><div class="edgeProCell">Diagnosis</div></div>`+rows.map(x=>{const r=x.reviewV60||v60ReviewTrade(x),rr=metricR(x);return `<div class="edgeProRow review"><div class="edgeProCell"><b>${escapeHtml(coin(x.symbol))}</b> · ${escapeHtml(x.tf||'')} · ${x.direction}</div><div class="edgeProCell ${rr>=0?'edgeProGood':'edgeProBad'}">${rr.toFixed(2)}</div><div class="edgeProCell">${r.grade} · ${r.processScore.toFixed(0)}</div><div class="edgeProCell">${escapeHtml(r.diagnosis)}</div></div>`}).join(""):'<div class="emptyState">No resolved journal outcomes yet.</div>'}



// v61 · Adaptive Governance & Champion/Challenger Pro
const V61_GOV_KEY="riskGovernorV61",V61_CHAMPION_KEY="championPolicyV61";
function v61GovSettings(){return {...{enabled:true},...v60StoreGet(V61_GOV_KEY,{})}}
function saveV61GovSettings(){const x={enabled:!!$("v61GovEnable")?.checked};v60StoreSet(V61_GOV_KEY,x);renderV61Governance();return x}
function v61StatsRows(rows){const vals=v60Vals(rows);return {...statPack(vals),vals}}
function v61EdgeDriftSnapshot(persist=false){
 const rows=v60ResolvedCurrent(),n=rows.length,feature=driftSnapshot?.state||"NO TEST",forward=v60ForwardEvidence(),shadow=shadowTradesV60().filter(x=>Number.isFinite(+x.netR)),shadowStats=statPack(shadow.map(x=>+x.netR));
 if(n<30){const x={ts:Date.now(),state:"LEARNING",health:50,confidence:v61ClampEvidence(n/30),n,base:{n:0,avg:0,pf:0,dd:0,win:0},recent:statPack(v60Vals(rows)),deltaExp:NaN,deltaPf:NaN,deltaWin:NaN,rolling:v60RollingStability(v60Vals(rows),10),feature,forward:{n:forward.st.n,avg:forward.st.avg,pf:forward.st.pf},shadow:shadowStats,reasons:["Need at least 30 resolved outcomes for baseline/recent drift comparison."]};window.__edgeDriftV61=x;return x}
 const recentN=Math.max(10,Math.min(30,Math.floor(n*.25))),baseRows=rows.slice(0,n-recentN),recentRows=rows.slice(n-recentN),base=v61StatsRows(baseRows),recent=v61StatsRows(recentRows),deltaExp=recent.avg-base.avg,deltaPf=recent.pf-base.pf,deltaWin=recent.win-base.win,rolling=v60RollingStability(v60Vals(rows),Math.max(10,Math.min(20,recentN))),reasons=[];let penalty=0;
 if(deltaExp<0){const p=Math.min(35,-deltaExp*70);penalty+=p;reasons.push(`Expectancy decay ${deltaExp.toFixed(2)}R`)}
 if(recent.avg<0){penalty+=20;reasons.push(`Recent expectancy ${recent.avg.toFixed(2)}R`)}
 if(recent.pf<1){penalty+=Math.min(18,(1-recent.pf)*22);reasons.push(`Recent PF ${recent.pf.toFixed(2)}`)}
 if(deltaWin<-.10){penalty+=Math.min(12,(-deltaWin-.10)*60+5);reasons.push(`Win-rate shift ${(deltaWin*100).toFixed(1)}pp`)}
 if(Number.isFinite(rolling.score)&&rolling.score<70){penalty+=Math.min(18,(70-rolling.score)*.45);reasons.push(`Rolling stability ${rolling.score.toFixed(0)}/100`)}
 if(feature==="WATCH"){penalty+=8;reasons.push("Feature PSI WATCH")}else if(feature==="DRIFT"){penalty+=20;reasons.push("Feature PSI DRIFT")}
 if(forward.st.n>=20&&forward.st.avg<=0){penalty+=18;reasons.push(`Forward expectancy ${forward.st.avg.toFixed(2)}R`)}
 if(shadowStats.n>=10&&shadowStats.avg<=0){penalty+=12;reasons.push(`Shadow expectancy ${shadowStats.avg.toFixed(2)}R`)}
 const health=v60Clamp(100-penalty),confidence=v61ClampEvidence(Math.min(1,n/80)*Math.min(1,recentN/20)),state=(recent.n>=15&&recent.avg<=-.25)||health<35?"SEVERE":health<55?"DRIFT":health<75?"WATCH":"STABLE",x={ts:Date.now(),state,health,confidence,n,base,recent,deltaExp,deltaPf,deltaWin,rolling,feature,forward:{n:forward.st.n,avg:forward.st.avg,pf:forward.st.pf},shadow:shadowStats,reasons:reasons.length?reasons:["No material edge decay detected."]};
 window.__edgeDriftV61=x;if(persist&&localDbSupported()&&!appSettings().privacySessionOnly){const bucket=Math.floor(x.ts/300000);localDbPutRecord("edge_drift_v61",`${bucket}|${assetClass()}|${analysisSource()}`,x,x.ts).catch(()=>{})}return x
}
function v61ClampEvidence(x){return v60Clamp((+x||0)*100)/100}
function v61RiskGovernor(edge=null){
 const settings=v61GovSettings(),e=edge||v61EdgeDriftSnapshot(false),g=riskGuard(),mv=window.__masterVerdict,ready=window.__profitReadiness||null,feature=driftSnapshot?.state||"NO TEST",shadow=e.shadow||{n:0,avg:0},caps=[],reasons=[];if(!settings.enabled)return {state:"OFF",mult:1,enabled:false,edge:e,reason:"Automatic governor disabled by user.",caps:[]};
 const cap=(name,v,why)=>{caps.push({name,mult:v});if(why)reasons.push(why)};cap("RECENT GUARD",g.state==="PAUSE"?0:(g.state==="CAUTION"||g.state==="LEARNING")?0.5:1,`Recent guard ${g.state}`);
 if(e.state==="SEVERE")cap("EDGE",0,"Severe edge decay");else if(e.state==="DRIFT")cap("EDGE",.25,"Edge drift");else if(e.state==="WATCH")cap("EDGE",.5,"Edge watch");else if(e.state==="LEARNING")cap("EDGE",.5,"Edge evidence learning");else cap("EDGE",1,"Edge stable");
 if(feature==="DRIFT")cap("MODEL DRIFT",.25,"Model/feature drift");else if(feature==="WATCH")cap("MODEL DRIFT",.5,"Model/feature watch");else cap("MODEL DRIFT",1,null);
 const q=+mv?.quality;if(Number.isFinite(q)){if(q<60)cap("DATA QUALITY",.25,`Data quality ${q.toFixed(0)}/100`);else if(q<75)cap("DATA QUALITY",.5,`Data quality ${q.toFixed(0)}/100`);else if(q<85)cap("DATA QUALITY",.75,`Data quality ${q.toFixed(0)}/100`);else cap("DATA QUALITY",1,null)}
 if(ready?.state==="NOT READY")cap("READINESS",.5,"Profit Readiness NOT READY");else if(ready?.state==="PAPER READY")cap("READINESS",.75,"Profit Readiness PAPER READY");else if(ready)cap("READINESS",1,null);
 if(shadow.n>=10&&shadow.avg<=-.20)cap("SHADOW",.25,`Shadow expectancy ${shadow.avg.toFixed(2)}R`);else if(shadow.n>=10&&shadow.avg<0)cap("SHADOW",.5,`Shadow expectancy ${shadow.avg.toFixed(2)}R`);else cap("SHADOW",1,null);
 let raw=Math.min(...caps.map(x=>x.mult)),mult=raw<=0?0:raw<=.25?.25:raw<=.5?.5:raw<=.75?.75:1,state=mult===0?"PAUSE":mult<=.25?"DEFENSIVE":mult<=.5?"REDUCED":mult<1?"CAUTION":"NORMAL",x={ts:Date.now(),enabled:true,state,mult,edge:e,guard:g.state,quality:Number.isFinite(q)?q:null,readiness:ready?.state||"UNKNOWN",feature,shadowN:shadow.n,shadowAvg:shadow.avg,caps,reason:reasons.join(" · ")||"All adaptive evidence caps are normal."};window.__riskGovernorV61=x;return x
}
function v61ContextKey(){const st=window.__radarState;return [assetClass(),analysisSource(),st?.symbol||norm($("symbol")?.value||""),st?.tf||$("tf")?.value||"?",st?.mode||$("mode")?.value||"auto"].join("|")}
function v61ChampionMap(){return v60StoreGet(V61_CHAMPION_KEY,{})||{}}
function v61ChampionPolicy(){const map=v61ChampionMap(),key=v61ContextKey();return map[key]||{key,name:"BASELINE",source:"DEFAULT",since:0,p:{threshold:64,stopMult:1.5,targetR:2,costMult:1}}}
function v61SetChampion(policy){const map=v61ChampionMap(),key=v61ContextKey();map[key]={...policy,key,since:Date.now()};v60StoreSet(V61_CHAMPION_KEY,map);return map[key]}
function v61PolicyLabel(p){return `T${(+p.threshold).toFixed(0)} · S${(+p.stopMult).toFixed(2)} · R${(+p.targetR).toFixed(1)} · C${(+p.costMult||1).toFixed(1)}×`}
function v61ChallengerCandidates(){
 const st=window.__radarState,src=analysisSource(),sym=st?.symbol||norm($("symbol")?.value||""),tf=st?.tf||$("tf")?.value,mode=st?.mode||$("mode")?.value,out=[];
 const oos=currentProfitReadinessOos();if(oos&&oos.source===src&&oos.symbol===sym&&oos.tf===tf&&oos.mode===mode&&[oos.threshold,oos.stopMult,oos.targetR].every(Number.isFinite))out.push({id:`WF-${oos.ts||0}`,name:"Walk-Forward Pro",source:"WALK_FORWARD_V60",p:{threshold:+oos.threshold,stopMult:+oos.stopMult,targetR:+oos.targetR,costMult:1},prior:{n:oos.n,avg:oos.avg,pf:oos.pf,dd:oos.dd},score:(+oos.avg||0)+Math.min(1,+oos.pf||0)*.08});
 for(const x of experimentRegistry()){if(x?.ctx?.source!==src||x?.ctx?.symbol!==sym||x?.ctx?.tf!==tf||x?.ctx?.mode!==mode)continue;if(!["CANDIDATE","PROMOTED"].includes(x.gate)&&!["CANDIDATE","PROMOTED"].includes(x.status))continue;out.push({id:x.id,name:x.name||"Experiment",source:"EXPERIMENT",p:{...x.p},prior:x.candidate,score:(+x.candidate?.avg||0)+Math.min(2,+x.candidate?.pf||0)*.06-(Math.abs(+x.candidate?.dd||0)*.005)})}
 return out.sort((a,b)=>b.score-a.score)
}
function v61PolicyStats(points,p){const vals=paramWfTrade(points,p,appSettings(),0,points.length),st=statsR(vals);return {...st,vals}}
async function runChampionChallenger(){
 const note=$("v61CcNote");if(note)note.textContent="Loading history and locked holdout…";try{const points=await rollingPoints();if(points.length<70)throw Error("Need at least 70 rolling historical points");let cands=v61ChallengerCandidates();if(!cands.length){const wf=await runWalkForwardOptimizer();if(wf)cands=[{id:`WF-${wf.ts}`,name:"Walk-Forward Pro",source:"WALK_FORWARD_V60",p:{threshold:+wf.threshold,stopMult:+wf.stopMult,targetR:+wf.targetR,costMult:1},prior:wf,score:+wf.avg||0}]}if(!cands.length)throw Error("No challenger candidate. Run an experiment or walk-forward optimizer first.");const champion=v61ChampionPolicy(),challenger=cands[0],holdStart=Math.max(45,Math.floor(points.length*.85)),holdPoints=points.slice(holdStart),champHold=v61PolicyStats(holdPoints,champion.p),challHold=v61PolicyStats(holdPoints,challenger.p),start=forwardStart(),fwdPoints=start?points.filter(x=>(+x.eventStartTs||0)>=start):[],champFwd=fwdPoints.length?v61PolicyStats(fwdPoints,champion.p):{n:0,avg:0,pf:0,dd:0,vals:[]},challFwd=fwdPoints.length?v61PolicyStats(fwdPoints,challenger.p):{n:0,avg:0,pf:0,dd:0,vals:[]},boot=(champHold.n>=5&&challHold.n>=5)?experimentDifferenceBootstrap(champHold.vals,challHold.vals,800,61017):{p:NaN,lo:NaN,hi:NaN},holdLead=challHold.n>=8&&challHold.avg>=champHold.avg+.05&&challHold.pf>=Math.max(1.10,champHold.pf*.95)&&challHold.dd>=champHold.dd-1.25&&(Number.isFinite(boot.p)?boot.p<=.15:true),forwardReady=!!start&&challFwd.n>=6&&champFwd.n>=6,forwardLead=forwardReady&&challFwd.avg>champFwd.avg&&challFwd.avg>0,state=holdLead?(forwardLead?"ELIGIBLE":"HOLDOUT LEADS · NEED FORWARD"):"CHAMPION HOLDS",row={ts:Date.now(),context:v61ContextKey(),champion,challenger,holdout:{start:holdStart,nPoints:holdPoints.length,champion:champHold,challenger:challHold,bootstrap:boot},forward:{start,nPoints:fwdPoints.length,champion:champFwd,challenger:challFwd,ready:forwardReady},holdLead,forwardLead,state};window.__championChallengerV61=row;localDbPutRecord("champion_challenger_v61",`${row.context}|${Math.floor(row.ts/300000)}`,row,row.ts).catch(()=>{});renderChampionChallengerV61();if(note)note.textContent=state==="ELIGIBLE"?"Challenger cleared locked holdout + forward evidence. Promotion changes only the research champion, never the base directional engine.":state==="HOLDOUT LEADS · NEED FORWARD"?"Challenger leads the untouched holdout but still lacks enough forward evidence.":"Champion remains in place under current evidence.";return row}catch(e){if(note)note.textContent="Champion/Challenger unavailable: "+e.message;toast(e.message,"warn");return null}
}
function promoteChallengerV61(){const x=window.__championChallengerV61;if(!x||x.state!=="ELIGIBLE"){toast("Challenger is not eligible: locked holdout + forward evidence must both lead.","warn");return false}v61SetChampion({name:x.challenger.name,source:x.challenger.source,candidateId:x.challenger.id,p:{...x.challenger.p},evidenceTs:x.ts});x.state="PROMOTED TO CHAMPION";x.promotedAt=Date.now();localDbPutRecord("champion_challenger_v61",`${x.context}|PROMOTE|${x.promotedAt}`,x,x.promotedAt).catch(()=>{});renderChampionChallengerV61();toast("Research champion promoted · base engine unchanged","good");return true}
function renderChampionChallengerV61(){const champ=v61ChampionPolicy(),x=window.__championChallengerV61,cand=x?.challenger||v61ChallengerCandidates()[0]||null;if($("v61Champion"))$("v61Champion").textContent=v61PolicyLabel(champ.p);if($("v61Challenger"))$("v61Challenger").textContent=cand?v61PolicyLabel(cand.p):"—";if($("v61CcState")){$("v61CcState").textContent=x?.state||"NOT TESTED";$("v61CcState").className=x?.state==="ELIGIBLE"||x?.state==="PROMOTED TO CHAMPION"?"good":x?.state?.includes("HOLDS")?"neutral":""}if($("v61CcHold"))$("v61CcHold").textContent=x?`${x.holdout.champion.avg.toFixed(2)} → ${x.holdout.challenger.avg.toFixed(2)} R`:"—";if($("v61CcForward"))$("v61CcForward").textContent=x&&x.forward.ready?`${x.forward.champion.avg.toFixed(2)} → ${x.forward.challenger.avg.toFixed(2)} R`:"—";if($("v61CcP"))$("v61CcP").textContent=x&&Number.isFinite(x.holdout.bootstrap.p)?x.holdout.bootstrap.p.toFixed(3):"—";if($("v61PromoteBtn"))$("v61PromoteBtn").disabled=x?.state!=="ELIGIBLE"}
function renderV61Governance(){
 const edge=v61EdgeDriftSnapshot(true),gov=v61RiskGovernor(edge),s=v61GovSettings();if($("v61GovEnable"))$("v61GovEnable").checked=s.enabled;
 if($("v61EdgeState")){$("v61EdgeState").textContent=edge.state;$("v61EdgeState").className=edge.state==="STABLE"?"good":edge.state==="SEVERE"||edge.state==="DRIFT"?"bad":"neutral"}if($("v61EdgeHealth"))$("v61EdgeHealth").textContent=edge.health.toFixed(0)+"/100";if($("v61EdgeBase"))$("v61EdgeBase").textContent=edge.base.n?edge.base.avg.toFixed(2)+" R":"—";if($("v61EdgeRecent"))$("v61EdgeRecent").textContent=edge.recent.n?edge.recent.avg.toFixed(2)+" R":"—";if($("v61EdgeDelta"))$("v61EdgeDelta").textContent=Number.isFinite(edge.deltaExp)?(edge.deltaExp>=0?"+":"")+edge.deltaExp.toFixed(2)+" R":"—";if($("v61EdgeFeature"))$("v61EdgeFeature").textContent=edge.feature;if($("v61EdgeWhy"))$("v61EdgeWhy").textContent=edge.reasons.join(" · ");
 if($("v61GovState")){$("v61GovState").textContent=gov.state;$("v61GovState").className=gov.mult===1?"good":gov.mult===0?"bad":"neutral"}if($("v61GovMult"))$("v61GovMult").textContent=gov.mult.toFixed(2)+"×";if($("v61GovReady"))$("v61GovReady").textContent=gov.readiness;if($("v61GovQuality"))$("v61GovQuality").textContent=Number.isFinite(gov.quality)?gov.quality.toFixed(0)+"/100":"—";if($("v61GovWhy"))$("v61GovWhy").textContent=gov.reason;renderChampionChallengerV61();return {edge,gov}
}



// v63 · Live-Cost & Execution Realism Pro
const V63_COST_KEY="liveCostV63";
function v63CostSettings(){return {...{instrument:"AUTO",borrowAnnualPct:8,locate:"UNKNOWN",fundingIntervalHours:8,holdHours:24},...v60StoreGet(V63_COST_KEY,{})}}
function v63ResolvedInstrument(cfg=v63CostSettings()){if(cfg.instrument&&cfg.instrument!=="AUTO")return cfg.instrument;return assetClass()==="STOCKS"?"STOCK":"SPOT"}
function saveV63CostSettings(){const x={instrument:$('v63Instrument')?.value||'AUTO',borrowAnnualPct:Math.max(0,Math.min(500,+$('v63BorrowPct')?.value||0)),locate:$('v63Locate')?.value||'UNKNOWN',fundingIntervalHours:Math.max(1,Math.min(24,+$('v63FundingHours')?.value||8)),holdHours:Math.max(.25,Math.min(720,+$('v63HoldHours')?.value||24))};v60StoreSet(V63_COST_KEY,x);renderV63LiveExecution();return x}
function v63CostInputSnapshot(direction){const s=v63CostSettings(),instrument=v63ResolvedInstrument(s),fundingRate=Number.isFinite(+window.__derivativesState?.funding)?+window.__derivativesState.funding:null;return {instrument,borrowAnnualPct:+s.borrowAnnualPct||0,locate:s.locate||'UNKNOWN',fundingIntervalHours:+s.fundingIntervalHours||8,fundingRate,direction}}
function v63CarryCostR(input,holdingHours,entry,stop){const x=input||{},hours=Math.max(0,+holdingHours||0),riskPct=entry>0?Math.abs(entry-stop)/entry:NaN;if(!(riskPct>0))return 0;let carryPct=0;if(x.instrument==='PERP'&&Number.isFinite(+x.fundingRate)){const intervals=hours/Math.max(1,+x.fundingIntervalHours||8),signed=(x.direction==='LONG'?1:-1)*(+x.fundingRate);carryPct+=signed*intervals}if(x.instrument==='STOCK'&&x.direction==='SHORT')carryPct+=(Math.max(0,+x.borrowAnnualPct||0)/100)*(hours/(365*24));return carryPct/riskPct}
function v63TradeCarryCostR(t,holdingHours){const x=t?.v63CostInput||v63CostInputSnapshot(t?.direction||'LONG');return v63CarryCostR(x,holdingHours,+t?.actualEntry||0,+t?.stop||0)}
function v63CarryFraction(input,holdingHours){const x=input||{},hours=Math.max(0,+holdingHours||0);let f=0;if(x.instrument==='PERP'&&Number.isFinite(+x.fundingRate)){const intervals=hours/Math.max(1,+x.fundingIntervalHours||8);f+=(x.direction==='LONG'?1:-1)*(+x.fundingRate)*intervals}if(x.instrument==='STOCK'&&x.direction==='SHORT')f+=(Math.max(0,+x.borrowAnnualPct||0)/100)*(hours/(365*24));return f}
function v63PaperCarryUsd(t,qty,price,barTs){const x=t?.v63CostInput||v63CostInputSnapshot(t?.direction||'LONG'),start=+t?.firstFillTs||+t?.opened||+t?.created||+barTs,hours=Math.max(0,(+barTs-start)/3600000),notional=Math.max(0,+qty||0)*Math.max(0,+price||+t?.entry||0);return notional*v63CarryFraction(x,hours)}
function v63TradeGapSuspected(t,prevTs,ts){const exp=v63TfMs(t?.tf);if(!Number.isFinite(exp)||exp>=86400000||!(prevTs>0&&ts>prevTs))return false;const d=ts-prevTs;if((t?.market||assetClass())==='STOCKS'&&d>8*3600000)return false;return d/exp>2.2}
function v63TfMs(tf){const m=String(tf||'').match(/^(\d+)([mhd])$/i);if(!m)return NaN;const n=+m[1],u=m[2].toLowerCase();return n*(u==='m'?60000:u==='h'?3600000:86400000)}
function v63InterruptionGuard(){const st=window.__radarState,rows=st?.j||[],tf=st?.tf||$('tf')?.value,exp=v63TfMs(tf);if(rows.length<3||!Number.isFinite(exp)||exp>=86400000)return {state:'N/A',gaps:0,detail:'Intraday gap guard not applicable.'};let gaps=0,worst=0;const a=rows.slice(-16);for(let i=1;i<a.length;i++){const d=+a[i][0]-+a[i-1][0];if(assetClass()==='STOCKS'&&d>8*3600000)continue;const ratio=d/exp;worst=Math.max(worst,ratio);if(ratio>2.2)gaps++}return gaps?{state:'SUSPECTED',gaps,worst,detail:`${gaps} unexplained intraday gap(s); worst ${worst.toFixed(1)}× expected interval. This is not an official halt feed.`}:{state:'CLEAR',gaps:0,worst,detail:'No unexplained recent intraday gap detected.'}}
function v63CurrentCostModel(){const s=v63CostSettings(),instrument=v63ResolvedInstrument(s),dir=window.__signalState?.tm?.direction||'LONG',st=window.__radarState,entry=st?.q?.price||0,stop=window.__signalState?.tm?.stop||0,input=v63CostInputSnapshot(dir),hours=s.holdHours,carryR=v63CarryCostR(input,hours,+entry,+stop),fr=Number.isFinite(+input.fundingRate)?+input.fundingRate:null,interrupt=v63InterruptionGuard(),locateBlock=instrument==='STOCK'&&dir==='SHORT'&&s.locate==='UNAVAILABLE';return {ts:Date.now(),instrument,direction:dir,hours,carryR,fundingRate:fr,borrowAnnualPct:+s.borrowAnnualPct||0,locate:s.locate,locateBlock,interrupt,input}}
function v63ExecutionGapStats(){const rows=shadowTradesV60().filter(x=>Number.isFinite(+x.executionGapBps)),vals=rows.map(x=>+x.executionGapBps),abs=vals.map(Math.abs),n=vals.length,avg=n?vals.reduce((a,b)=>a+b,0)/n:NaN,mae=n?abs.reduce((a,b)=>a+b,0)/n:NaN,p90=n?percentile(abs,.90):NaN,state=n<5?'LEARNING':mae<=5?'GOOD':mae<=15?'WATCH':'POOR';return {n,avg,mae,p90,state,rows}}
function v63LiveReadiness(persist=true){const ready=window.__profitReadiness||profitReadinessSnapshot(),edge=typeof v61EdgeDriftSnapshot==='function'?v61EdgeDriftSnapshot(false):{state:'LEARNING',health:50},gov=typeof v61RiskGovernor==='function'?v61RiskGovernor(edge):{mult:1,state:'NORMAL'},ph=window.__providerHealthV62||null,gap=v63ExecutionGapStats(),cost=v63CurrentCostModel(),shadow=shadowTradesV60().filter(x=>Number.isFinite(+x.netR)),shadowStats=statPack(shadow.map(x=>+x.netR)),evidence=ready.state==='SMALL LIVE READY'?100:ready.state==='PAPER READY'?65:Math.min(50,(+ready.coverage||0)*.55),execution=gap.n>=10?Math.max(0,Math.min(100,100-gap.mae*4)):gap.n?Math.min(60,20+gap.n*4):10,data=ph?+ph.score||0:Math.min(70,+window.__masterVerdict?.quality||0),stability=Math.max(0,Math.min(100,(+edge.health||0)*(gov.mult>0?1:.4))),costScore=cost.locateBlock?0:cost.instrument==='PERP'&&!Number.isFinite(cost.fundingRate)?40:cost.instrument==='STOCK'&&cost.direction==='SHORT'&&cost.locate==='UNKNOWN'?50:90,score=Math.round(.30*evidence+.20*execution+.20*data+.20*stability+.10*costScore),hard={strictEvidence:ready.state==='SMALL LIVE READY',provider:!!ph&&(+ph.score||0)>=75,shadow:shadowStats.n>=10&&shadowStats.avg>-.05,execution:gap.n>=8&&gap.mae<=15,drift:!['SEVERE'].includes(edge.state)&&gov.mult>0,cost:!cost.locateBlock&&(cost.instrument!=='PERP'||Number.isFinite(cost.fundingRate))&&(cost.instrument!=='STOCK'||cost.direction!=='SHORT'||cost.locate==='AVAILABLE')},allHard=Object.values(hard).every(Boolean),state=score>=80&&allHard?'SMALL CAPITAL ELIGIBLE':score>=60?'NEAR · NOT ELIGIBLE':'NOT ELIGIBLE',reasons=[];for(const [k,v] of Object.entries(hard))if(!v)reasons.push(k);const x={ts:Date.now(),score,state,components:{evidence,execution,data,stability,cost:costScore},hard,reasons,profitReadiness:ready.state,shadow:{n:shadowStats.n,avg:shadowStats.avg},executionGap:gap,costModel:cost,governor:{state:gov.state,mult:gov.mult},edge:{state:edge.state,health:edge.health},provider:ph?{state:ph.state,score:ph.score}:null};window.__liveReadinessV63=x;if(persist)localDbPutRecord('live_readiness_v63',String(Math.floor(x.ts/300000)),x,x.ts).catch(()=>{});return x}
function renderV63LiveExecution(){const s=v63CostSettings(),cost=v63CurrentCostModel(),gap=v63ExecutionGapStats(),lr=v63LiveReadiness();if($('v63Instrument'))$('v63Instrument').value=s.instrument;if($('v63BorrowPct'))$('v63BorrowPct').value=s.borrowAnnualPct;if($('v63Locate'))$('v63Locate').value=s.locate;if($('v63FundingHours'))$('v63FundingHours').value=s.fundingIntervalHours;if($('v63HoldHours'))$('v63HoldHours').value=s.holdHours;if($('v63Funding'))$('v63Funding').textContent=Number.isFinite(cost.fundingRate)?(cost.fundingRate*100).toFixed(4)+'%':'N/A';if($('v63CarryR'))$('v63CarryR').textContent=Number.isFinite(cost.carryR)?cost.carryR.toFixed(3)+' R':'—';if($('v63Interrupt')){$('v63Interrupt').textContent=cost.interrupt.state;$('v63Interrupt').className=cost.interrupt.state==='CLEAR'?'good':cost.interrupt.state==='SUSPECTED'?'neutral':''}if($('v63CostState'))$('v63CostState').textContent=cost.locateBlock?'BLOCK · locate unavailable':`${cost.instrument} · ${cost.direction}`;if($('v63GapN'))$('v63GapN').textContent=gap.n;if($('v63GapAvg'))$('v63GapAvg').textContent=Number.isFinite(gap.avg)?(gap.avg>=0?'+':'')+gap.avg.toFixed(2)+' bps':'—';if($('v63GapMae'))$('v63GapMae').textContent=Number.isFinite(gap.mae)?gap.mae.toFixed(2)+' bps':'—';if($('v63GapP90'))$('v63GapP90').textContent=Number.isFinite(gap.p90)?gap.p90.toFixed(2)+' bps':'—';if($('v63GapState')){$('v63GapState').textContent=gap.state;$('v63GapState').className=gap.state==='GOOD'?'good':gap.state==='POOR'?'bad':'neutral'}if($('v63LiveScore'))$('v63LiveScore').textContent=lr.score+'/100';if($('v63LiveState')){$('v63LiveState').textContent=lr.state;$('v63LiveState').className=lr.state==='SMALL CAPITAL ELIGIBLE'?'good':lr.state.startsWith('NOT')?'bad':'neutral'}for(const [id,k] of [['v63LiveEvidence','evidence'],['v63LiveExecution','execution'],['v63LiveData','data'],['v63LiveStability','stability'],['v63LiveCost','cost']])if($(id))$(id).textContent=Math.round(lr.components[k])+'/100';if($('v63LiveWhy'))$('v63LiveWhy').textContent=lr.state==='SMALL CAPITAL ELIGIBLE'?'All v63 eligibility gates pass. This is still not a profit guarantee or an instruction to trade.':`Blocked/unfinished gates: ${lr.reasons.join(', ')||'score below threshold'}.`;return lr}

const _market=localStorage.getItem("assetClass")||"CRYPTO";if($("assetClass"))$("assetClass").value=_market;$("symbol").value=_market==="STOCKS"?(localStorage.getItem("lastStock")||"AAPL"):(localStorage.getItem("lastCrypto")||localStorage.getItem("last")||"BTC");$("mode").value=localStorage.getItem("mode")||"auto";const _src=localStorage.getItem("analysisProvider")||appSettings().spotProvider||"BINANCE";if($("analysisSource")){$("analysisSource").value=_market==="STOCKS"?"TWELVEDATA":_src;$("analysisSource").disabled=_market==="STOCKS"}localStorage.setItem("analysisProvider",_src);document.body.classList.toggle("marketModeStock",_market==="STOCKS");document.body.classList.toggle("marketModeCrypto",_market!=="STOCKS");loadScanPrefs();renderLists();renderSignals();show("dash");syncTop(norm($("symbol").value),$("tf").value,$("mode").value);updateSourceLineage(analysisSource());updateScannerUi();if($("volume24Label"))$("volume24Label").textContent=_market==="STOCKS"?"Daily $ volume":"Volum 24H USDT";$("status").textContent=_market==="STOCKS"?"US Stocks mode ready.":"Crypto mode ready.";
$("symbol").addEventListener("keydown",e=>{if(e.key==="Enter"){if(typeof v71RenderJournal==="function")v71RenderJournal();analyze(true)}});
$("symbol").addEventListener("change",()=>{if(typeof v71RenderJournal==="function")v71RenderJournal()});
$("tf").addEventListener("change",()=>syncTop(norm($("symbol").value),$("tf").value,$("mode").value));
$("mode").addEventListener("change",()=>syncTop(norm($("symbol").value),$("tf").value,$("mode").value));


// v71 read-only hardening: v68/v69 live execution code removed.

// v71 · Pionex Read-Only Journal Correctness & Reconciliation
const V71_JOURNAL_PREFIX="pionexJournalV71:",V71_CURRENT_SYMBOL_KEY="pionexJournalCurrentV71",V71_SYNC_KEY="pionexJournalSyncV71";
function v71SafeSymbol(value){return String(value||"").toUpperCase().replace(/[^A-Z0-9_]/g,"").slice(0,40)}
function v71CurrentSymbol(){const fromUi=typeof $==="function"&&$("symbol")?`${coin(norm($("symbol").value))}_USDT`:"";return v71SafeSymbol(fromUi||v60StoreGet(V71_CURRENT_SYMBOL_KEY,""))}
function v71EmptyJournal(symbol=""){return {schema:71,symbol:v71SafeSymbol(symbol),fills:[],trades:[],openLots:[],unmatched:[],missingOrders:[],updated:0,readOnly:true,complete:false}}
function v71StoredJournal(symbol=v71CurrentSymbol()){const s=v71SafeSymbol(symbol);return s?v60StoreGet(V71_JOURNAL_PREFIX+s,v71EmptyJournal(s)):v71EmptyJournal("")}
function v71Id(x,kind="fill"){const keys=kind==="order"?["orderId","order_id","id"]:["fillId","fill_id","tradeId","trade_id","id"];for(const k of keys)if(x?.[k]!=null&&String(x[k]))return String(x[k]);return [kind,x?.orderId||x?.order_id||"?",x?.timestamp||x?.time||x?.createTime||0,x?.side||"?",x?.price||0,x?.size||x?.quantity||x?.amount||0].join(":")}
function v71Rows(payload,keys){for(const k of keys){const v=k.split(".").reduce((a,p)=>a?.[p],payload);if(Array.isArray(v))return v}return []}
function v71FeeUsd(fee,feeCoin,symbol,price){const amount=Math.abs(+fee||0),coin=String(feeCoin||"").toUpperCase(),[base,quote]=v71SafeSymbol(symbol).split("_");if(!amount)return {feeUsd:0,coverage:"ZERO"};if(coin===quote||coin==="USDT")return {feeUsd:amount,coverage:"QUOTE_EXACT"};if(coin===base&&Number.isFinite(+price)&&+price>0)return {feeUsd:amount*+price,coverage:"BASE_AT_FILL"};return {feeUsd:null,coverage:"UNRESOLVED"}}
function v71NormalizeFill(x,symbol){const resolvedSymbol=v71SafeSymbol(x.symbol||symbol),side=String(x.side||x.orderSide||"").toUpperCase(),price=+x.price||+x.fillPrice||+x.avgPrice||0,qty=+x.size||+x.quantity||+x.qty||+x.filledSize||0,fee=Math.abs(+x.fee||+x.feeAmount||+x.commission||0),feeCoin=String(x.feeCoin||x.feeAsset||x.commissionAsset||"").toUpperCase(),ts=+x.timestamp||+x.time||+x.createTime||+x.updatedTime||null,converted=v71FeeUsd(fee,feeCoin,resolvedSymbol,price);return {fillId:v71Id(x),orderId:v71Id(x,"order"),symbol:resolvedSymbol,side,price,qty,quote:price*qty,fee,feeCoin,feeUsd:converted.feeUsd,feeCoverage:converted.coverage,ts,rawStatus:String(x.status||"FILLED"),source:"PIONEX"}}
function v71Dedupe(rows,key="fillId"){const map=new Map();for(const x of rows||[]){const id=String(x?.[key]||""),symbol=v71SafeSymbol(x?.symbol),compound=`${symbol}|${id}`;if(id&&symbol&&!map.has(compound))map.set(compound,x)}return [...map.values()].sort((a,b)=>(+a.ts||0)-(+b.ts||0))}
function v71BuildTrades(fills,radarOrderIds=[]){const radar=new Set((radarOrderIds||[]).map(String)),lotBooks=new Map(),trades=[],unmatched=[];for(const f of v71Dedupe(fills)){const symbol=v71SafeSymbol(f.symbol);if(!symbol||!f.qty||!f.price||!["BUY","SELL"].includes(f.side)){unmatched.push({...f,reason:"INVALID_FILL"});continue}if(!(+f.ts>0)){unmatched.push({...f,reason:"MISSING_TIMESTAMP"});continue}const lots=lotBooks.get(symbol)||[];lotBooks.set(symbol,lots);if(f.side==="BUY"){const feeInBaza=String(f.feeCoin||"").toUpperCase()===symbol.split("_")[0]&&+f.fee>0&&+f.fee<f.qty?+f.fee:0;lots.push({...f,remaining:f.qty-feeInBaza,feeRemainingUsd:f.feeUsd!=null&&Number.isFinite(+f.feeUsd)?+f.feeUsd:null});continue}let remain=f.qty;while(remain>1e-12&&lots.length){const lot=lots[0],q=Math.min(remain,lot.remaining),buyFee=lot.feeRemainingUsd!=null&&Number.isFinite(+lot.feeRemainingUsd)?+lot.feeRemainingUsd*q/lot.remaining:null,sellFee=f.feeUsd!=null&&Number.isFinite(+f.feeUsd)?+f.feeUsd*q/f.qty:null,gross=(f.price-lot.price)*q,fees=buyFee!=null&&sellFee!=null?buyFee+sellFee:null,net=fees!=null?gross-fees:null,origin=radar.has(String(lot.orderId))||radar.has(String(f.orderId))?"RADAR":"MANUAL",feeCoverage=fees!=null?`${lot.feeCoverage}+${f.feeCoverage}`:"UNRESOLVED";trades.push({id:`${symbol}:${lot.fillId}:${f.fillId}:${trades.length}`,symbol,side:"LONG",openedAt:lot.ts,closedAt:f.ts,entry:lot.price,exit:f.price,qty:q,grossPnl:gross,fees,funding:0,netPnl:net,returnPct:lot.price&&net!=null?net/(lot.price*q)*100:null,feeCoverage,entryOrderId:lot.orderId,exitOrderId:f.orderId,entryFillId:lot.fillId,exitFillId:f.fillId,origin,status:net!=null?"CLOSED":"REVIEW_FEE",source:"PIONEX"});lot.remaining-=q;if(lot.feeRemainingUsd!=null&&buyFee!=null)lot.feeRemainingUsd=Math.max(0,lot.feeRemainingUsd-buyFee);remain-=q;if(lot.remaining<=1e-12)lots.shift()}if(remain>1e-12)unmatched.push({...f,qty:remain,reason:"SELL_WITHOUT_MATCHED_BUY"})}return {trades,openLots:[...lotBooks.values()].flat(),unmatched}}
async function v71RadarOrderIds(){const ids=[];try{const rows=(await localDbRecords("live_execution_v68",0,5000)).map(x=>x.data);for(const x of rows)for(const k of ["orderId","entryOrderId","exitOrderId"])if(x?.[k]!=null)ids.push(String(x[k]))}catch{}return [...new Set(ids)]}
function v71JournalStats(j=v71StoredJournal()){const t=j.trades||[],resolved=t.filter(x=>x.netPnl!=null&&Number.isFinite(+x.netPnl)),net=resolved.reduce((a,x)=>a+(+x.netPnl||0),0),fees=resolved.reduce((a,x)=>a+(+x.fees||0),0),wins=resolved.filter(x=>+x.netPnl>0).length,radar=t.filter(x=>x.origin==="RADAR").length,feeReview=t.length-resolved.length;return {fills:(j.fills||[]).length,trades:t.length,resolved:resolved.length,net,fees,funding:0,wins,winRate:resolved.length?wins/resolved.length:0,radar,manual:t.length-radar,unmatched:(j.unmatched||[]).length,openLots:(j.openLots||[]).length,feeReview,complete:!!j.complete}}
// v71: Pionex refuza rafalele. La 429 serverul spune cat sa astepte; reluam
// de cateva ori in loc sa omoram toata sincronizarea de 365 de zile.
// v74.6: si fara 429, cererile de istoric pleaca la cel putin 1,1 s una de
// alta - 365 de zile inseamna zeci de ferestre, iar Pionex refuza rafalele.
let v71UltimaCerere=0;
const V71_PAUZA_MS=1100;
async function v71Pauza(){
  const astept=v71UltimaCerere+V71_PAUZA_MS-Date.now();
  if(astept>0)await new Promise(r=>setTimeout(r,astept));
  v71UltimaCerere=Date.now();
}
async function v71CereCuRabdare(url,incercari=4){
  for(let i=0;;i++){
    try{return await getJSON(url)}
    catch(e){
      if(e.status!==429||i>=incercari-1)throw e;
      const cerut=Number(e.retryAfter),sec=Number.isFinite(cerut)&&cerut>0?cerut:2*(i+1);
      await new Promise(r=>setTimeout(r,Math.min(60,sec)*1000));
    }
  }
}
async function v71HistoryWindow(action,symbol,startTime,endTime,depth=0,budget={requests:0,truncated:false}){if(budget.requests>=64){budget.truncated=true;return []}budget.requests++;const q=new URLSearchParams({action,symbol,limit:"100",startTime:String(Math.max(0,Math.floor(startTime))),endTime:String(Math.max(0,Math.floor(endTime)))}),payload=(await v71Pauza(),await v71CereCuRabdare(`/api/pionex-account?${q}`)),rows=v71Rows(payload,action==="fills"?["data.fills","data.trades","data","fills"]:["data.orders","data","orders"]);if(rows.length<100||depth>=12||endTime-startTime<=3600000){if(rows.length>=100)budget.truncated=true;return rows}const mid=Math.floor((startTime+endTime)/2),left=await v71HistoryWindow(action,symbol,startTime,mid,depth+1,budget),right=await v71HistoryWindow(action,symbol,mid+1,endTime,depth+1,budget);return [...left,...right]}
async function v71FetchHistory(action,symbol){const end=Date.now(),start=end-365*86400000,budget={requests:0,truncated:false},rows=[],windowMs=30*86400000;for(let from=start;from<end&&budget.requests<64;from+=windowMs){const to=Math.min(end,from+windowMs-1);rows.push(...await v71HistoryWindow(action,symbol,from,to,0,budget))}if(budget.requests>=64)budget.truncated=true;return {rows,requests:budget.requests,truncated:budget.truncated,start,end}}
function v71RenderJournal(){const symbol=v71CurrentSymbol(),j=v71StoredJournal(symbol),s=v71JournalStats(j);if($("v71FillCount"))$("v71FillCount").textContent=s.fills;if($("v71TradeCount"))$("v71TradeCount").textContent=s.trades;if($("v71NetPnl")){$("v71NetPnl").textContent=s.resolved?(s.net>=0?"+":"")+s.net.toFixed(4)+" USDT":"—";$("v71NetPnl").className=s.net>0?"good":s.net<0?"bad":"neutral"}const issues=s.unmatched+s.feeReview+(j.missingOrders||[]).length+(j.complete?0:1);if($("v71ReconState")){$("v71ReconState").textContent=issues?`REVIEW ${issues}`:"RECONCILED";$("v71ReconState").className=issues?"neutral":"good"}if($("v71SyncNote"))$("v71SyncNote").textContent=j.updated?`${symbol} · last sync ${new Date(j.updated).toLocaleString()} · fees ${s.fees.toFixed(4)} USDT · ${s.radar} RADAR / ${s.manual} MANUAL · open lots ${s.openLots} · ${j.complete?"365d complete":"history truncated"}.`:`${symbol||"Current symbol"} has not been synchronized.`;if($("v71JournalRows"))$("v71JournalRows").innerHTML=s.trades?`<div class="accountRow"><div class="accountCell">Closed / Origin</div><div class="accountCell">Entry → Exit</div><div class="accountCell">Qty / Fees</div><div class="accountCell">Net P&amp;L</div></div>`+[...j.trades].sort((a,b)=>b.closedAt-a.closedAt).slice(0,40).map(x=>`<div class="accountRow"><div class="accountCell">${new Date(x.closedAt).toLocaleString()}<br>${escapeHtml(x.origin)}</div><div class="accountCell">${num(x.entry)} → ${num(x.exit)}</div><div class="accountCell">${(+x.qty).toFixed(8)}<br>${x.fees!=null&&Number.isFinite(+x.fees)?`fee ${(+x.fees).toFixed(4)} USDT`:"fee REVIEW"}</div><div class="accountCell ${x.netPnl!=null&&Number.isFinite(+x.netPnl)?x.netPnl>=0?"good":"bad":"neutral"}">${x.netPnl!=null&&Number.isFinite(+x.netPnl)?`${x.netPnl>=0?"+":""}${(+x.netPnl).toFixed(4)} USDT`:"REVIEW FEE"}</div></div>`).join(""):'<div class="emptyState">No closed Pionex trades synchronized for this symbol.</div>';window.__pionexJournalV71={journal:j,stats:s};return s}
// --- Boti de grid Pionex -------------------------------------------------
// Jurnalul v71 citeste doar spot. Banii pot sta intr-un bot de grid pe
// perpetue, invizibil peste tot altundeva. Aici ii aratam - si aratam
// profitul NET, nu cifra bruta de grid care induce in eroare.
// v74.6: lipsa se verifica INAINTE de +v. Number(null)===0 si
// Number.isFinite(+null)===true - asa ajungea "nu stiu" pe ecran ca
// "+0.0000 USDT" sau "lichidare la −0.0%".
function botiNr(v){if(v==null||v===""||typeof v==="boolean")return null;const n=+v;return Number.isFinite(n)?n:null}
function botiBan(v,zecimale=4,cuSemn=true){
  const n=botiNr(v);if(n===null)return '—';
  return `${cuSemn&&n>=0?'+':''}${n.toFixed(zecimale)} USDT`
}
function botiClasa(v){const n=botiNr(v);return n===null?'lipsa':n>0?'good':n<0?'bad':'neutral'}
// Suma pe boti a unui camp: daca un singur bot n-are cifra, totalul e
// NECUNOSCUT ("—"), nu suma celorlalti - altfel un total partial s-ar citi ca intreg.
function botiSuma(bots,camp){let t=0;for(const b of bots){const n=botiNr(b&&b[camp]);if(n===null)return null;t+=n}return bots.length?t:null}
// Lichidarea dupa contractul rutei: partea (jos/sus), distanta SEMNATA,
// DEPASITA, "fara pret"; distanta e fata de ULTIMUL pret, nu de pretul de marcaj.
function botiLichidareText(b){
  const pl=botiNr(b&&b.pretLichidare),abs=pl!==null&&pl>0?' (la '+num(pl)+')':'';
  const parte=b&&b.lichidarePartea==='sus'?'sus':b&&b.lichidarePartea==='jos'?'jos':null;
  if(b&&b.motivFaraDistanta==='fara-pret')return {text:'lichidare'+abs+': nu pot socoti (fără preț)',cls:'neutral'};
  const d=botiNr(b&&b.distantaLichidarePct);
  if(b&&b.lichidareDepasita===true||(d!==null&&d<0))return {text:'LICHIDARE DEPĂȘITĂ'+(parte?' ('+parte+')':'')+abs,cls:'bad'};
  if(d===null)return {text:abs?'lichidare'+abs:'lichidare —',cls:'neutral'};
  const semn=parte==='sus'?'+':parte==='jos'?'−':'';
  return {text:'lichidare '+(parte?parte+' ':'')+'la '+semn+d.toFixed(1)+'%'+abs,cls:d<8?'bad':d<15?'tbWarn':''}
}
// Aceeasi forma si pentru masura Tabloului (tablou-bot.js: valoare/partea/depasita/pretLichidare).
function tbLichidareDinMasura(ml){return botiLichidareText({lichidarePartea:ml&&ml.partea,distantaLichidarePct:ml&&ml.valoare,lichidareDepasita:!!(ml&&ml.depasita),pretLichidare:ml&&ml.pretLichidare})}
function tbLichidareScurt(ml){
  const d=ml&&ml.valoare,parte=ml&&(ml.partea==="sus"||ml.partea==="jos")?ml.partea:null;
  if(d==null)return "—";
  if(ml.depasita||d<0)return "DEPĂȘITĂ"+(parte?" ("+parte+")":"")+" cu "+Math.abs(+d).toFixed(2)+"%";
  return parte?parte+" "+(parte==="sus"?"+":"\u2212")+Math.abs(+d).toFixed(2)+"%":tbFormateazaSemn(+d,2)+"%";
}
function botiLichidareHtml(b){const l=botiLichidareText(b);return `<span class="${l.cls}">${escapeHtml(l.text)}</span><br><span class="fine">față de ultimul preț</span>`}
function botiBaniHtml(b){
  const nesigur=b.pnlNerealizatSigur===false?' <span class="fine">(neutru: semn nesigur)</span>':'';
  return `<span class="accountLabel">Realizat NET</span><b class="${botiClasa(b.profitNet)}">${botiBan(b.profitNet)}</b><br>`+
    `<span class="accountLabel">Nerealizat (poziție)</span><b class="${botiClasa(b.pnlNerealizat)}">${botiBan(b.pnlNerealizat)}</b>${nesigur}<br>`+
    `<span class="accountLabel">Total</span><b class="${botiClasa(b.profitTotal)}">${botiBan(b.profitTotal)}</b><br>`+
    `<span class="fine">realizat brut ${botiBan(b.profitRealizatBrut)} (fără comisioane/finanțare) · grid brut ${botiBan(b.gridProfitBrut)} · comision ${botiBan(b.comisioane)}</span>`
}
// Ce a raportat serverul ca NU a mers (ex. 429 pe preturi, totaluri incomplete).
function botiProblemeText(p){
  if(!p||typeof p!=='object')return [];
  return Object.entries(p).map(([k,v])=>{
    if(k==='preturi')return `Prețurile PERP nu s-au putut citi (${v}) - distanța la lichidare și nerealizatul pot lipsi.`;
    if(k==='sumarIncomplet')return `Totalurile de sus sunt incomplete (lipsește: ${Array.isArray(v)?v.join(', '):v}) - se arată —.`;
    return `${k}: ${Array.isArray(v)?v.join(', '):typeof v==='object'?JSON.stringify(v):v}`
  })
}
// Du-l exact unde se pune parola, cu cursorul in camp.
function mergiLaParola(){
  navTo('settings');
  const c=$('apiSessionToken');
  if(c){try{c.scrollIntoView({block:'center'})}catch(e){}c.focus()}
}
// fetch() cazut arunca TypeError; fara nume, "reteaua a picat" nu se mai
// deosebeste de o eroare oarecare in tablou-bot.js (explicaEroarea).
function textEroare(e){const m=String(e&&e.message!=null?e.message:e);return e&&e.name==="TypeError"&&!/^TypeError/.test(m)?"TypeError: "+m:m}
function eroareDeParola(mesaj,status){return status===401||/AUTH_(REQUIRED|INVALID|RATE_LIMITED)/.test(String(mesaj||''))}
// Traducerea erorilor pentru om: cea de la tablou-bot.js (Task 2), plus
// blocarea pe parole gresite, care vine de la server si nu e o eroare Pionex.
function explicaEroareaAplicatiei(mesaj,status){
  if(/AUTH_RATE_LIMITED/.test(String(mesaj||'')))return {titlu:"Prea multe parole greșite",
    ceFac:"Serverul a oprit pentru un minut cererile de pe acest dispozitiv, după prea multe parole greșite. Așteaptă un minut și verifică parola din Setări (trebuie să fie exact textul APP_API_TOKEN de la pornire)."};
  if(typeof TabloBot!=='undefined'&&TabloBot.explicaEroarea)return TabloBot.explicaEroarea(mesaj,status,(typeof location!=='undefined'&&location.hostname)||'');
  return {titlu:"Nu am putut citi boții",ceFac:String(mesaj||"")}
}
async function incarcaBoti(cuToast=false){
  const stare=$('botiStare'),randuri=$('botiRanduri');
  if(stare)stare.textContent='CITESC…';
  if(randuri)randuri.innerHTML='<div class="emptyState">Intreb Pionex…</div>';
  let d=null;
  try{d=await getJSON('/api/bot-orders');if(!d||!Array.isArray(d.bots))throw new Error('Raspuns nevalid de la /api/bot-orders - lipseste lista de boti.')}
  catch(e){
    // Acelasi traducator ca pe Tablou (tablou-bot.js): omul afla CE sa faca, nu codul.
    const ex=explicaEroareaAplicatiei(textEroare(e),e.status);
    const buton=eroareDeParola(e.message,e.status)?'<br><button class="actionGhost" data-action-click="mergiLaParola()">Deschide Setări (parola)</button>':'';
    if(stare){stare.textContent='EROARE';stare.className='stockBadge bad'}
    if(randuri)randuri.innerHTML=`<div class="emptyState"><b>${escapeHtml(ex.titlu)}</b><br>${escapeHtml(ex.ceFac)}${buton}</div>`;
    if(cuToast)toast(`Boți: ${ex.titlu}`,'bad');
    window.__botiPionex={eroare:e.message};return null
  }
  window.__botiPionex=d;
  const s=d.sumar||{},bots=d.bots.filter(Boolean);
  if($('botiNumar'))$('botiNumar').textContent=`${s.active??'—'} / ${s.numar??bots.length}`;
  if($('botiInvestit'))$('botiInvestit').textContent=botiBan(s.investitTotal,2,false);
  if($('botiProfitNet')){const n=$('botiProfitNet');n.textContent=botiBan(s.profitNetTotal);n.className=botiClasa(s.profitNetTotal)}
  const nerealizat=botiSuma(bots,'pnlNerealizat'),total=botiSuma(bots,'profitTotal');
  if($('botiNerealizat')){const n=$('botiNerealizat');n.textContent=botiBan(nerealizat);n.className=botiClasa(nerealizat)}
  if($('botiTotal')){const n=$('botiTotal');n.textContent=botiBan(total);n.className=botiClasa(total)}
  if($('botiProfitBrut'))$('botiProfitBrut').textContent=botiBan(s.gridProfitBrutTotal);
  if($('botiComisioane'))$('botiComisioane').textContent=botiBan(s.comisioaneTotal);
  const toateAvert=bots.flatMap(b=>(Array.isArray(b.avertismente)?b.avertismente:[]).map(a=>`${b.simbol}: ${a}`));
  const probleme=botiProblemeText(d.probleme);
  if($('botiAvertismente'))$('botiAvertismente').innerHTML=
    toateAvert.map(a=>`<div class="noticeBad">⚠ ${escapeHtml(a)}</div>`).join('')+
    probleme.map(a=>`<div class="noticeBad">⚠ Server: ${escapeHtml(a)}</div>`).join('');
  if(stare){
    // "0 AVERTISMENTE" pe verde mintea cand serverul spunea ca n-a putut citi preturile.
    const coadaProbleme=probleme.length?` · ${probleme.length} PROBLEME`:'';
    stare.textContent=(bots.length?`${s.active??'—'} ACTIVI · ${toateAvert.length} AVERTISMENTE`:'NICIUN BOT')+coadaProbleme;
    stare.className='stockBadge '+(toateAvert.length||probleme.length?'neutral':'good')
  }
  if(randuri)randuri.innerHTML=bots.length?(
    `<div class="accountRow"><div class="accountCell">Bot / pornit</div>
     <div class="accountCell">Investit / levier</div>
     <div class="accountCell">Preț / interval / lichidare</div>
     <div class="accountCell">Bani (USDT)</div></div>`+
    bots.map(b=>`<div class="accountRow">
      <div class="accountCell"><b>${escapeHtml(b.simbol)}</b><br>${b.pornitLa?new Date(b.pornitLa).toLocaleString():'—'}<br>${escapeHtml(b.stareInterna||b.stare||'')}</div>
      <div class="accountCell">${botiBan(b.investit,2,false)}<br>${b.levier?escapeHtml(String(b.levier))+'× '+escapeHtml(b.directie||''):'—'}<br>${escapeHtml(String(b.ordinePerechi??'—'))} perechi din ${escapeHtml(String(b.ordinePlasate??'—'))}</div>
      <div class="accountCell">${escapeHtml(String(b.pretCurent??'—'))}<br>${escapeHtml(String(b.gridJos??'—'))} … ${escapeHtml(String(b.gridSus??'—'))}<br>${botiLichidareHtml(b)}</div>
      <div class="accountCell botiBani">${botiBaniHtml(b)}</div>
    </div>`).join('')
  ):'<div class="emptyState">Niciun bot în contul Pionex.</div>';
  if(probleme.length&&cuToast)toast('Boți: '+probleme.join(' · '),'warn');
  const netTotal=botiNr(s.profitNetTotal);
  if(cuToast)toast(`Boți: ${bots.length} · realizat net ${botiBan(s.profitNetTotal)}`,netTotal===null?'warn':netTotal>=0?'good':'warn');
  return d
}
var TB_ISTORIC_PREFIX="tabloBotIstoric_v1_",TB_MOD="tabloBotMod_v1",TB_BOT_ALES="tabloBotAles_v1";
var tbStare={bot:null,botBrut:null,boti:[],klinePerp:[],klineStare:"ok",
  pretSpot:null,pretSpotLa:0,ws:null,wsSimbol:null,wsIncercari:0,wsTimeout:null,
  ceas:null,routeOk:null,eroare:null,eroareStatus:null,probleme:null,
  motivAlegere:null,stocareStricata:false,istoric:[]};
function tbCiteste(cheie){try{return JSON.parse(localStorage.getItem(cheie)||"null")||null}catch(e){return null}}
function tbScrie(cheie,val){try{localStorage.setItem(cheie,JSON.stringify(val));return true}catch(e){return false}}
function tbPretSpotProaspat(){return tbStare.pretSpot!=null&&(Date.now()-tbStare.pretSpotLa)<=60000}
// Minus tipografic (U+2212) doar cand cifra chiar e negativa - un minus pus
// mereu in fata ar minti exact ca bug-ul reparat la lichidare (vezi mai jos).
function tbFormateazaSemn(v,zecimale){
  var z=zecimale==null?1:zecimale;
  return v<0?"\u2212"+Math.abs(v).toFixed(z):v.toFixed(z);
}
function tbAlegeBot(id){
  // Alegerea omului se tine pe disc, ca sa supravietuiasca unui refresh. Daca
  // botul dispare intre timp, alegeBot cade inapoi pe automat SI spune asta.
  tbScrie(TB_BOT_ALES,String(id||""));
  var alegere=TabloBot.alegeBot(tbStare.boti,String(id||""));
  tbStare.bot=alegere.bot;tbStare.motivAlegere=alegere.motiv;
  tbStare.botBrut=tbStare.bot?tbStare.bot.brut||null:null;
  // Simbol nou => lumanari noi, WebSocket nou, istoricul altui bot.
  tbStare.klinePerp=[];tbStare.pretSpot=null;tbStare.pretSpotLa=0;tbStare.istoric=[];
  renderTabloBot();
  tbAduDate().then(renderTabloBot);
}
function tbDeseneazaSelectorul(){
  var sel=$("tbBotAles");if(!sel)return;
  var boti=tbStare.boti||[];
  // Sub doi boti nu e nimic de ales - butonul ar fi zgomot.
  if(boti.length<2){sel.hidden=true;sel.innerHTML="";return}
  sel.hidden=false;
  var curent=tbStare.bot?String(tbStare.bot.id):"";
  var html="";
  for(var i=0;i<boti.length;i++){
    var b=boti[i],id=String(b.id);
    html+='<option value="'+escapeHtml(id)+'"'+(id===curent?" selected":"")+">"+
      escapeHtml(b.simbol+(b.activ?"":" (oprit)"))+"</option>";
  }
  sel.innerHTML=html;
}
function tbSchimbaModul(){
  var b=tbStare.bot,brut=tbStare.botBrut;
  if(!b||!brut)return toast("Niciun bot de comutat","warn");
  // `modBot` din modulul pur citeste bot.strategyId, NU id-ul normalizat (care
  // poate cadea pe buOrderId) - cheia de aici TREBUIE sa fie exact aceeasi,
  // altfel alegerea se scrie sub o cheie pe care modBot n-o citeste niciodata.
  var sid=brut.strategyId!=null?String(brut.strategyId):null;
  if(!sid)return toast("Acest bot nu are strategyId - comutatorul de mod e dezactivat pentru el.","warn");
  var alegeri=tbCiteste(TB_MOD)||{},acum=TabloBot.modBot(brut,alegeri).mod;
  alegeri[sid]=acum==="GRID"?"DIRECTIONAL":"GRID";
  // Acelasi reziduu ca la I6, pe cealalta cale de scriere: daca localStorage
  // e blocat, scrierea esueaza tacut - badge-ul ar ramane pe vechea valoare
  // in timp ce toastul minte "succes". Verificam valoarea de intoarcere.
  if(!tbScrie(TB_MOD,alegeri)){
    toast("N-am putut retine modul - stocarea locala e blocata in acest browser.","bad");
    return;
  }
  toast("Mod: "+alegeri[sid],"good");renderTabloBot();
}
async function tbAduDate(){
  tbStare.eroare=null;
  try{
    var d=await getJSON("/api/bot-orders");
    if(!d||!Array.isArray(d.bots))throw new Error("Raspuns nevalid de la /api/bot-orders - lipseste lista de boti.");
    tbStare.probleme=d.probleme||null;
    tbStare.boti=d.bots;
    // Alegerea sta in modulul pur (probata acolo): preferinta omului bate, apoi
    // un bot ACTIV, apoi primul. Ruta intoarce si boti inchisi, iar ordinea nu e
    // garantata. Motivul se pastreaza fiindca omul trebuie sa poata afla daca se
    // uita la botul LUI sau la unul ales de ecran.
    var alegere=TabloBot.alegeBot(d.bots,tbCiteste(TB_BOT_ALES));
    tbStare.bot=alegere.bot;tbStare.motivAlegere=alegere.motiv;
    tbStare.botBrut=tbStare.bot?tbStare.bot.brut||null:null;
    tbStare.routeOk=true;
  }catch(e){
    // Ruta a picat - nu stim daca exista bot sau nu. Golim botul curent ca sa
    // nu mai ceara lumanari si sa nu mai scrie in istoric cu date vechi -
    // altfel o pana de retea ar minti verdictul (masurat mai jos, in raport).
    tbStare.eroare=textEroare(e);tbStare.eroareStatus=e.status||null;tbStare.routeOk=false;
    tbStare.bot=null;tbStare.botBrut=null;tbStare.boti=[];tbStare.motivAlegere=null;
  }
  if(tbStare.bot){
    var s=TabloBot.simboluri(tbStare.bot.baza,tbStare.bot.quote);
    try{
      var k=await getJSON("/api/market?type=pionex_klines&symbol="+encodeURIComponent(s.pionex)+"&interval=5M&limit=100");
      // Sortam dupa timp, nu presupunem ordinea - la fel ca pionexKlines() mai
      // sus in fisier. `.reverse()` presupune "cel mai nou primul"; daca
      // Pionex ar intoarce vreodata crescator, seria s-ar inversa tacut si
      // pretPerp ar deveni lumanarea cea mai VECHE.
      tbStare.klinePerp=((k.data&&k.data.klines)||[]).slice().sort(function(a,b){return Number(a.time)-Number(b.time)});
      tbStare.klineStare="ok";
    }catch(e){
      // Pastram lumanarile vechi (mai bine decat nimic), dar le marcam invechite.
      tbStare.klineStare="invechit";
    }
    // Colectorul de fundal (alt ecran) cheama tot tbAduDate() - dar n-are
    // voie sa deschida WebSocket cand nu esti pe panou: "fara WebSocket in
    // fundal" cere pretul spot ramas null in istoric (vezi tbColectorTick).
    if(tbPanouVizibil())tbPorneWs(s.binance);
    if(tbStare.bot.id){
      // Istoricul se tine PE BOT (cheie cu id-ul normalizat), nu intr-o cheie
      // comuna - contorul de perechi e cumulativ per bot, un istoric amestecat
      // ar minti pe ritm.
      var cheie=TB_ISTORIC_PREFIX+String(tbStare.bot.id);
      var ist=tbCiteste(cheie)||[];
      // pretSpot INGHETAT (o pana de WebSocket) nu are voie sa intre in istoric
      // ca fiind viu - aceeasi familie de bug ca pana de ruta de mai jos: daca
      // scriem tacut pretul mort, mediana basis-ului se otraveste in tacere.
      // Botul ales - banii vin de aici. Fara Number(x)||0: lipsa ramane null,
      // nu un profit fals de zero (capcana Number(null)===0).
      var b=tbStare.bot;
      ist=TabloBot.istoricAdauga(ist,{t:Date.now(),perechi:b.ordinePerechi??null,
        pretPerp:b.pretCurent,pretSpot:tbPretSpotProaspat()?tbStare.pretSpot:null,
        profitNet:b.profitNet!=null?Number(b.profitNet):null,
        comisioane:b.comisioane!=null?Number(b.comisioane):null,
        gridProfitBrut:b.gridProfitBrut!=null?Number(b.gridProfitBrut):null,
        investit:b.investit!=null?Number(b.investit):null},Date.now());
      var srv=tbStare.istoricServer;
      if(srv&&srv.bot===tbStare.bot.id&&srv.intrari.length)ist=TabloBot.imbinaIstoric(ist,srv.intrari,Date.now());
      tbStare.stocareStricata=!tbScrie(cheie,ist);
      tbStare.istoric=ist;
    }else{
      // Lipsa lui `id` opreste DOAR istoricul (n-avem pe ce cheie sa-l tinem) -
      // lumanarile si WebSocket-ul de mai sus tot au voie sa mearga.
      tbStare.istoric=[];
    }
  }else{
    tbStare.klinePerp=[];tbStare.klineStare="ok";tbStare.istoric=[];
  }
  renderTabloBot();
}
function tbInchideWs(){
  if(tbStare.wsTimeout){clearTimeout(tbStare.wsTimeout);tbStare.wsTimeout=null}
  if(tbStare.ws){
    try{
      tbStare.ws.onopen=null;tbStare.ws.onmessage=null;
      tbStare.ws.onerror=null;tbStare.ws.onclose=null;
      tbStare.ws.close();
    }catch(e){}
  }
  tbStare.ws=null;
}
function tbDeschideWs(simbol){
  try{
    var soc=new WebSocket("wss://stream.binance.com/ws/"+simbol.toLowerCase()+"@trade");
    tbStare.ws=soc;
    soc.onopen=function(){tbStare.wsIncercari=0};
    soc.onmessage=function(ev){
      try{
        var d=JSON.parse(ev.data);tbStare.pretSpot=Number(d.p);tbStare.pretSpotLa=Date.now();
        if($("tbPret")&&tbStare.wsSimbol===simbol)$("tbPret").textContent="spot "+d.p;
      }catch(e){}
    };
    soc.onerror=function(){try{soc.close()}catch(e){}};
    // Binance inchide singur stream-urile la 24h - fara reconectare aici,
    // pretul spot ar inghieta pe veci si ecranul l-ar arata tot ca "viu".
    soc.onclose=function(){
      if(tbStare.ws!==soc)return;
      tbStare.ws=null;
      if(tbStare.wsSimbol!==simbol)return;
      tbStare.wsIncercari=Math.min(tbStare.wsIncercari+1,6);
      var pauza=Math.min(30000,1000*Math.pow(2,tbStare.wsIncercari));
      tbStare.wsTimeout=setTimeout(function(){tbStare.wsTimeout=null;tbDeschideWs(simbol)},pauza);
    };
  }catch(e){
    tbStare.wsTimeout=setTimeout(function(){tbStare.wsTimeout=null;tbDeschideWs(simbol)},5000);
  }
}
function tbPorneWs(simbol){
  if(tbStare.wsSimbol===simbol&&(tbStare.wsTimeout||(tbStare.ws&&tbStare.ws.readyState<=1)))return;
  tbInchideWs();
  if(tbStare.wsSimbol!==simbol){
    // Schimbare de simbol (bot nou) - pretul vechi nu mai e valabil pentru
    // simbolul nou, altfel basis-ul s-ar socoti perp-nou vs spot-vechi.
    tbStare.pretSpot=null;tbStare.pretSpotLa=0;
  }
  tbStare.wsSimbol=simbol;tbStare.wsIncercari=0;
  tbDeschideWs(simbol);
}
function opresteTabloBot(){
  tbInchideWs();
  tbColectorRecadenteaza();
}
// Colectorul aduna istoric cat timp APLICATIA e deschisa, pe orice ecran -
// altfel ecranul pe care Marius il vrea central e orb cat sta pe alt ecran.
// Cadenta: 8 s cand panoul se vede, 60 s cand nu. Fara WebSocket in fundal:
// pretul spot ramane null in istoric, iar consumatorii sar peste null.
// E singurul loc care mai cheama tbAduDate() cu regularitate - ceasul vechi
// din porneTabloBot() a fost scos, ca sa nu bata Pionex de doua ori cat esti
// pe panou (limita de ritm a bursei e a omului, nu a codului).
var tbColector=null,tbColectorPas=0;
// ===== v78: 🧮 Grid - ce setez acum? =====
// Calculul e in lib/grid-calcul.js + lib/grid-proba.js (probate in scripts/grid-v78.mjs);
// aici doar aduc lumanarile Pionex si desenez fisa. Merge intreg doar de acasa:
// pe Cloudflare Pionex refuza cererile (v72), iar fisa o spune, nu arata cifre goale.
var grStare={H:2,dir:null,simbol:null,date:null,la:0,inLucru:false,eroare:null,fisa:null,monede:null,timer:null};
var GR_REIMPROSPATARE_MS=5*60*1000;
function grSimbol(t){var s=String(t==null?"":t).trim().toUpperCase().replace(/[^A-Z0-9]/g,"").replace(/PERP$/,"").replace(/USDT$/,"");return s?s+"_USDT_PERP":null}
function grNumar(t){var s=String(t==null?"":t).trim().replace(/\s/g,"").replace(",",".");if(!s)return null;var x=Number(s);return Number.isFinite(x)&&x>0?x:null}
function grPanouVizibil(){return !!($("gridset")&&$("gridset").classList.contains("on"))}
async function grAduMonede(){
  if(grStare.monede)return;
  try{
    var d=await getJSON("/api/market?type=pionex_symbols&market=PERP");
    var a=d&&d.data&&Array.isArray(d.data.symbols)?d.data.symbols:[];
    var m={};a.forEach(function(x){if(x&&x.symbol&&x.status==="TRADING")m[x.symbol]=x});
    if(!Object.keys(m).length)return;
    grStare.monede=m;
    var dl=$("grMonede");if(dl)dl.innerHTML=Object.keys(m).sort().map(function(s){return '<option value="'+escapeHtml(s.replace(/_USDT_PERP$/,""))+'">'}).join("");
  }catch(e){grStare.monede=null}
}
function porneGrid(){
  grAduMonede();grSoldInPagina();gridJurnalActualizeaza(false);gridClasamentAdu(false);gridLaboratorAdu();
  if(!grStare.timer)grStare.timer=setInterval(function(){if(grPanouVizibil()&&grStare.simbol)gridCalculeaza()},GR_REIMPROSPATARE_MS);
  renderGrid();
}
function grPauza(ms){return new Promise(function(r){setTimeout(r,ms)})}
function grRanduri(k){return k&&k.data&&Array.isArray(k.data.klines)?k.data.klines:null}
async function grAduLumanari(simbol){
  var baza="/api/market?type=pionex_klines&symbol="+encodeURIComponent(simbol);
  var r15=[],end=null;
  for(var p=0;p<6;p++){
    var k=await getJSON(baza+"&interval=15M&limit=500"+(end?"&endTime="+end:""));
    var r=grRanduri(k);
    if(!r){if(p===0)throw Error((k&&(k.error||k.detail||k.message||k.code))||"Pionex nu a dat lumânări");break}
    r15=r15.concat(r);
    var t=r.map(function(x){return Number(x&&x.time)}).filter(Number.isFinite);
    if(r.length<500||!t.length)break;
    end=Math.min.apply(null,t)-1;
    await grPauza(350);
  }
  var r4=grRanduri(await getJSON(baza+"&interval=4H&limit=300"));await grPauza(350);
  var r1=grRanduri(await getJSON(baza+"&interval=1D&limit=200"));
  return {r15:r15,r4:r4||[],r1:r1||[]};
}
function grTextEroare(e){
  var local=/^(127\.0\.0\.1|localhost)$/.test(location.hostname);
  // limita serverului (45 cereri Pionex/minut) sau racirea Pionex: spus pe romaneste, cu reincercare
  if(local&&e&&(e.status===429||/RATE_LIMITED|429/i.test(String(e.message)))){
    if(!grStare.reincercare){grStare.reincercare=setTimeout(function(){grStare.reincercare=null;if(grPanouVizibil())gridCalculeaza('fortat')},70000)}
    return "Prea multe cereri la Pionex într-un minut (limita e 45). Reîncerc singur în ~1 minut.";
  }
  if(!local&&e&&(e.status===429||e.status===403||/429|unavailable/i.test(String(e.message))))return "Pionex nu răspunde de aici: pe versiunea publicată refuză cererile. Deschide Radarul de acasă (PORNESTE-CRYPTO-RADAR.bat).";
  return textEroare(e);
}
async function gridCalculeaza(fortat){
  var simbol=grSimbol($("grMoneda")&&$("grMoneda").value),suma=grNumar($("grSuma")&&$("grSuma").value),lev=grNumar($("grLevier")&&$("grLevier").value);
  if(!simbol){grStare.fisa=null;grStare.eroare="Scrie o monedă, de exemplu MET.";renderGrid();return}
  if(!suma){grStare.fisa=null;grStare.eroare="Scrie suma în USDT, de exemplu 100.";renderGrid();return}
  if(grStare.monede&&!grStare.monede[simbol]){grStare.fisa=null;grStare.eroare=simbol.replace(/_USDT_PERP$/,"")+" nu există ca PERP pe Pionex.";renderGrid();return}
  if(grStare.inLucru){grStare.reface=true;return}
  var proaspat=grStare.date&&grStare.simbol===simbol&&Date.now()-grStare.la<GR_REIMPROSPATARE_MS-5000&&!fortat;
  grStare.inLucru=true;grStare.eroare=null;renderGrid();
  try{
    if(!proaspat){grStare.date=await grAduLumanari(simbol);grStare.simbol=simbol;grStare.la=Date.now()}
    var d=grStare.date,info=grStare.monede&&grStare.monede[simbol];
    if(grStare.monede&&!info)throw Error(simbol.replace(/_USDT_PERP$/,"")+" nu există ca PERP pe Pionex.");
    var f=GridProba.fisa({simbol:simbol,pret:GridCalcul.pretCurent(d.r15),b15:GridCalcul.bare(d.r15),b4h:GridCalcul.bare(d.r4),b1d:GridCalcul.bare(d.r1),
      suma:suma,H:grStare.H,dir:grStare.dir,levier:lev?Math.round(lev):null,minNotional:info?Number(info.minNotional):null,minSize:info?Number(info.minSizeLimit):null});
    if(f.eroare){grStare.fisa=null;grStare.eroare=f.eroare}else{f.info=info||null;grStare.fisa=f}
  }catch(e){grStare.fisa=null;grStare.eroare=grTextEroare(e)}
  finally{grStare.inLucru=false}
  renderGrid();
  // a apasat pe alta moneda / alta directie cat se calcula: refacem pe ce e ACUM in inputuri
  if(grStare.reface){grStare.reface=false;gridCalculeaza('fortat')}
}
// F4: soldul si pierderea acceptata se tin minte pe dispozitiv (nu pleaca nicaieri)
function grSoldCitit(){try{var v=JSON.parse(localStorage.getItem("grSold")||"null");return v&&typeof v==="object"?v:{}}catch(e){return {}}}
function gridSold(){
  var sold=grNumar($("grSold")&&$("grSold").value),pierdere=grNumar($("grPierdere")&&$("grPierdere").value);
  try{localStorage.setItem("grSold",JSON.stringify({sold:sold,pierdere:pierdere}))}catch(e){}
  if(grStare.fisa)renderGrid();
}
function grSoldInPagina(){var v=grSoldCitit();if($("grSold")&&v.sold>0&&!$("grSold").value)$("grSold").value=String(v.sold);if($("grPierdere")&&v.pierdere>0)$("grPierdere").value=String(v.pierdere)}
function gridOrizont(h){grStare.H=Number(h)||2;[1,2,3].forEach(function(x){var b=$("grH"+x);if(b)b.setAttribute("aria-pressed",String(x===grStare.H))});if(grStare.date)gridCalculeaza()}
function gridDirectie(d){grStare.dir=d==="auto"?null:d;["auto","long","neutru","short"].forEach(function(x){var b=$("grD"+x);if(b)b.setAttribute("aria-pressed",String((grStare.dir||"auto")===x))});if(grStare.date)gridCalculeaza()}
function gridCopiaza(v){
  v=String(v==null?"":v);if(!v)return;
  var gata=function(){toast("Copiat: "+v,"good")};
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(v).then(gata,function(){toast("Nu am putut copia; scrie de mână: "+v,"bad")});
  else toast("Scrie de mână: "+v,"bad");
}
// Zecimalele monedei: DOAR daca quotePrecision e un intreg >= 0 dat explicit (null si "" NU
// inseamna 0 - Number(null)===0 ar fi rotunjit preturile la intregi). Fara ea: dupa marime,
// iar sub 0,0001 pastreaza 6 cifre semnificative (0.00001234, nu 0.000012).
function grZec(info){
  if(!info||info.quotePrecision==null||info.quotePrecision==="")return null;
  var z=Number(info.quotePrecision);return Number.isInteger(z)&&z>=0&&z<=12?z:null;
}
function grFmt(x,zec){
  if(x==null||!Number.isFinite(x))return null;
  if(zec!=null)return x.toFixed(zec);
  if(x>=1000)return x.toFixed(2);
  if(x>=1)return x.toFixed(4);
  if(x>=0.0001||x<=0)return x.toFixed(6);
  return x.toFixed(Math.min(12,5-Math.floor(Math.log10(x))));
}
function grPret(x,info){var s=grFmt(x,grZec(info));return s==null?"—":s}
// v78.1: randul pentru indicatorul GRID-FISA din TradingView (pine-scripts/GRID-FISA):
// dir;jos;sus;grile;levier;stopJos;stopSus;lichJos;lichSus;suma - lipsa se scrie 0, pretul la precizia monedei.
// v78.2: 10 campuri (+suma); stop-ul se trimite DOAR unde il arata fisa (la short nu exista stop jos;
// la long, sus e take-profit - Pine il eticheteaza asa); precizia prin grZec/grFmt.
function grCodTV(st,info){
  var zec=grZec(info),p=function(x){var s=grFmt(x,zec);return s==null?"0":s};
  var stopJos=st.dir==="short"?null:(st.stop&&st.stop.jos);
  return [st.dir,p(st.jos),p(st.sus),String(st.grile),String(st.levier),p(stopJos),p(st.stop&&st.stop.sus),p(st.lichidare&&st.lichidare.jos),p(st.lichidare&&st.lichidare.sus),st.suma>0?String(st.suma):"0"].join(";");
}
var GR_DIR={long:"📈 LONG",neutru:"↔️ NEUTRU",short:"📉 SHORT"},GR_DIR_PIONEX={long:"Long",neutru:"Neutral",short:"Short"};
var GR_NIVEL={porneste:["🟢 PORNEȘTE","good"],asteapta:["🟡 AȘTEAPTĂ","tbWarn"],nu:["🔴 NU PORNI","bad"],"fara-date":["⚪ FĂRĂ DATE","mutedInfo"]};
function grRand(et,val,copiat){return '<div class="grRand"><span class="tbEt2">'+escapeHtml(et)+'</span><b>'+escapeHtml(val)+'</b>'+(copiat!=null?'<button type="button" class="actionGhost grCopy" value="'+escapeHtml(copiat)+'" data-action-click="gridCopiaza(this.value)" aria-label="Copiază '+escapeHtml(et)+'">copiază</button>':'<span></span>')+'</div>'}
// F4: randul "cat investesc?" - din sold, pierderea acceptata si cea mai proasta fereastra a directiei alese
function grRandSumaMaxima(f){
  var v=grSoldCitit(),sold=grNumar($("grSold")&&$("grSold").value)||v.sold,pierdere=grNumar($("grPierdere")&&$("grPierdere").value);
  var pe=f.proba.pe[f.dir]||{},a=pe.antren&&pe.antren.ceaMaiProasta,t=pe.test&&pe.test.ceaMaiProasta;
  var rea=a==null?(t==null?null:t):(t==null?a:Math.min(a,t));   // cea mai proasta din TOATE ferestrele
  if(!(sold>0))return grRand("Cât investesc?","scrie soldul contului mai sus și îți spun");
  if(!(pierdere>0))return grRand("Cât investesc?","scrie ce pierdere accepți, în % din cont (mai mare ca 0)");
  var max=GridProba.sumaMaxima(sold,pierdere,rea);
  if(max==null)return grRand("Cât investesc?",rea==null?"n-am cea mai proastă fereastră":"pe istoric nicio fereastră n-a ieșit pe minus: nu pot socoti un maxim");
  var P=GridCalcul.procent,text="cel mult "+Math.floor(max)+" USDT · ca cea mai proastă fereastră ("+P(rea)+") să nu treacă de "+pierdere+"% din "+sold+" USDT";
  if(f.setare.suma>max)text+=" · ⚠ ai pus "+f.setare.suma+", adică "+(f.setare.suma*Math.abs(rea)/sold*100).toFixed(1).replace(".",",")+"% din cont în cel mai rău caz";
  return grRand("Cât investesc?",text,String(Math.floor(max)));
}
// ===== F2: jurnalul gridurilor (localStorage "grJurnal"; logica pura in lib/grid-jurnal.js) =====
var GR_JURNAL_CHEIE="grJurnal",grJurnalStare={boti:null,la:0,inLucru:false,eroare:null};
function grJurnalCitit(){var t=null;try{t=localStorage.getItem(GR_JURNAL_CHEIE)}catch(e){}return GridJurnal.citeste(t)}
function grJurnalScrie(l){try{localStorage.setItem(GR_JURNAL_CHEIE,JSON.stringify(l))}catch(e){}}
function gridJurnalAdauga(){
  var f=grStare.fisa;if(!f)return;
  grJurnalScrie(GridJurnal.adauga(grJurnalCitit(),f,Date.now()));
  toast("Notat în jurnal: "+f.simbol.replace(/_USDT_PERP$/,"")+" "+GR_DIR[f.dir]+" · "+f.setare.suma+" USDT","good");
  gridJurnalActualizeaza(true);
}
function gridJurnalSterge(id){var l=grJurnalCitit().filter(function(e){return e.id!==id});grJurnalScrie(l);renderGridJurnal()}
// botii (activi + inchisi) se citesc rar; lista null = citire picata (nu inchidem nimic)
async function gridJurnalActualizeaza(fortat){
  var l=grJurnalCitit();
  if(!l.length){renderGridJurnal();return}
  if(grJurnalStare.inLucru)return;
  if(!fortat&&Date.now()-grJurnalStare.la<5*60000){renderGridJurnal();return}
  grJurnalStare.inLucru=true;
  try{
    var d=await getJSON("/api/bot-orders");
    var boti=d&&Array.isArray(d.bots)?d.bots:null;
    var cu=null;
    try{cu=await getJSON("/api/bot-orders?status=finished");}catch(e){cu=null}
    if(boti&&cu&&Array.isArray(cu.bots)){var ids={};boti.forEach(function(b){if(b&&b.id)ids[b.id]=1});cu.bots.forEach(function(b){if(b&&b.id&&!ids[b.id])boti.push(b)})}
    grJurnalStare.boti=boti;grJurnalStare.la=Date.now();grJurnalStare.eroare=boti?null:"Pionex nu a dat lista de boți";
    if(boti)grJurnalScrie(GridJurnal.actualizeaza(l,boti,Date.now()));
  }catch(e){grJurnalStare.eroare=grTextEroare(e)}
  finally{grJurnalStare.inLucru=false}
  renderGridJurnal();
}
// v79.4: calibrarea din rezultatele LUI - propune pragul "mediana verde", nu il schimba singur
function grCalibrareHtml(l){
  var c=GridJurnal.calibrare(l,GridCalcul.C.MEDIANA_VERDE),P=GridCalcul.procent,V=c.peVerdict;
  var rand=function(k){var x=V[k];if(!x||!x.n)return "";return '<li>'+escapeHtml((GR_NIVEL[k]||[k])[0])+': '+x.pePlus+' din '+x.n+' pe plus ('+P(x.pePlus/x.n)+', IC '+P(x.ic[0])+' – '+P(x.ic[1])+')</li>'};
  var h='<div class="grCalibrare"><h5>🎯 Calibrarea: verdictele au nimerit?</h5>';
  if(!c.n)return h+'<p class="tbSub">Încă niciun bot închis din jurnal. Calibrarea pornește singură de la 30 de boți închiși.</p></div>';
  h+='<ul class="grLista">'+["porneste","asteapta","nu"].map(rand).join("")+'</ul>';
  if(!c.suficient)return h+'<p class="tbSub">'+c.n+' boți închiși: mai trebuie '+c.lipsa+' până propun ceva despre praguri (sub 30, orice „învățare” e noroc).</p></div>';
  if(c.propus===null)return h+'<p class="tbSub">Nu am destui boți pe fiecare prag ca să aleg unul.</p></div>';
  var ta=c.test.cuActual,tp=c.test.cuPropus;
  h+='<p>Pragul „mediana verde” acum: <b>'+P(c.actual)+'</b> · ales pe primele 2/3 din boți: <b>'+P(c.propus)+'</b>. Pe ultima treime (nevăzută): cu pragul de acum '+ta.n+' boți, '+P(ta.pePlus)+' pe plus, medie '+P(ta.medie)+' · cu cel propus '+tp.n+' boți, '+P(tp.pePlus)+' pe plus, medie '+P(tp.medie)+'.</p>';
  h+=c.confirmat?'<p class="good"><b>CONFIRMAT</b> pe boții nevăzuți: merită mutat pragul la '+P(c.propus)+'. Spune-mi și îl mut în cod (cu probă).</p>':'<p class="tbSub"><b>NECONFIRMAT</b>: pe boții nevăzuți diferența nu trece de noroc. Pragul rămâne.</p>';
  return h+'</div>';
}
function renderGridJurnal(){
  var box=$("grJurnal"),sub=$("grJurnalSub");if(!box)return;
  var l=grJurnalCitit().slice().sort(function(a,b){return b.t-a.t}),P=GridCalcul.procent;
  if(!l.length){box.innerHTML='<p class="tbSub">Niciun grid pornit din fișă încă.</p>';return}
  var r=GridJurnal.rezumat(l),niv=function(k){var x=r[k];if(!x||!x.n)return "";return (GR_NIVEL[k]?GR_NIVEL[k][0]:k)+": "+x.n+(x.legate?" · "+x.legate+" cu rezultat, media "+P(x.mediaPct)+", "+x.pePlus+" pe plus":" · fără rezultat încă")};
  var rez=["porneste","asteapta","nu"].map(niv).filter(Boolean).join(" &nbsp;|&nbsp; ");
  if(sub)sub.textContent=(grJurnalStare.eroare?grJurnalStare.eroare+" · ":"")+l.length+" în jurnal"+(grJurnalStare.la?" · boții citiți la "+new Date(grJurnalStare.la).toLocaleTimeString("ro-RO",{hour:"2-digit",minute:"2-digit"}):"");
  var h='<p class="grRezumat">'+rez+'</p><div class="grTabelWrap"><table class="grTabel"><thead><tr><th>Când</th><th>Moneda</th><th>Verdict</th><th>Setarea</th><th>Proba a zis</th><th>Real</th><th>Stare</th><th></th></tr></thead><tbody>';
  l.forEach(function(e){
    var baza=e.investit>0?e.investit:e.suma,pct=e.rezultat!=null&&baza>0?e.rezultat/baza:null;
    var real=e.botId?(e.rezultat!=null?(e.rezultat>=0?"+":"")+e.rezultat.toFixed(2)+" USDT ("+P(pct)+")":"—"):"nelegat de un bot";
    var stare=!e.botId?"aștept botul în Pionex":e.activ?"rulează":"închis"+(e.inchisLa?" "+new Date(e.inchisLa).toLocaleDateString("ro-RO",{day:"2-digit",month:"2-digit"}):"");
    h+='<tr><td>'+new Date(e.t).toLocaleString("ro-RO",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})+'</td><td>'+escapeHtml(GridJurnal.moneda(e.simbol))+'</td><td>'+escapeHtml((GR_NIVEL[e.verdict]||["?"])[0])+'</td>'
      +'<td>'+escapeHtml((GR_DIR[e.dir]||e.dir||"?")+" "+(e.levier||"?")+"× · "+(e.grile||"?")+" grile · "+(e.suma!=null?e.suma:"?")+" USDT")+'</td>'
      +'<td>'+escapeHtml("mediana "+P(e.mediana)+", cea mai proastă "+P(e.ceaMaiProasta))+'</td>'
      +'<td class="'+(pct==null?"":pct>=0?"good":"bad")+'">'+escapeHtml(real)+'</td><td>'+escapeHtml(stare)+'</td>'
      +'<td><button type="button" class="actionGhost grCopy" value="'+escapeHtml(e.id)+'" data-action-click="gridJurnalSterge(this.value)" aria-label="Șterge">✕</button></td></tr>';
  });
  h+='</tbody></table></div>'+grCalibrareHtml(l);
  box.innerHTML=h+'<p class="grNota">Rezultatul real e profitul total al botului din Pionex (grile + poziție − comisioane), în % din investiție. Legarea se face pe monedă și pe ora pornirii (±). După 10–20 de boți, rezumatul de sus spune dacă verdictele au adus bani.</p>';
}
// ===== F3: clasamentul (scris acasa de colector; aici doar se citeste si se arata) =====
var grClasament={date:null,la:0,eroare:null,inLucru:false};
async function gridClasamentAdu(fortat){
  if(grClasament.inLucru||(!fortat&&Date.now()-grClasament.la<5*60000))return;
  grClasament.inLucru=true;
  try{var d=await getJSON("/api/istoric-bot?action=clasament");grClasament.date=d&&d.clasament||null;grClasament.eroare=null}
  catch(e){grClasament.eroare=e&&e.status===503?"doar pe Radarul de acasă (colectorul îl socotește o dată pe oră)":textEroare(e)}
  finally{grClasament.inLucru=false;grClasament.la=Date.now()}
  renderGridClasament();
}
// v79.5: laboratorul (scris acasa de colector o data pe zi)
var grLaborator={date:null,la:0,eroare:null};
async function gridLaboratorAdu(){
  if(Date.now()-grLaborator.la<10*60000&&grLaborator.date)return;
  try{var d=await getJSON("/api/istoric-bot?action=laborator");grLaborator.date=d&&d.laborator||null;grLaborator.eroare=null}
  catch(e){grLaborator.eroare=e&&e.status===503?"doar pe Radarul de acasă":textEroare(e)}
  grLaborator.la=Date.now();renderGridLaborator();
}
function renderGridLaborator(){
  var box=$("grLaborator"),sub=$("grLaboratorSub");if(!box)return;
  var L=grLaborator.date,P=GridCalcul.procent;
  if(grLaborator.eroare){box.innerHTML='<p class="tbSub">'+escapeHtml(grLaborator.eroare)+'</p>';return}
  if(!L||!Array.isArray(L.intrebari)){box.innerHTML='<p class="tbSub">Încă nu a rulat: colectorul de acasă îl face la ~30 de minute după pornire, apoi o dată pe zi.</p>';return}
  if(sub)sub.textContent="socotit la "+new Date(L.la).toLocaleString("ro-RO",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})+" · "+L.monede+" monede · "+L.ferestre+" ferestre de grid neutru de "+L.H+" zile";
  var V={dovedit:["✅ DOVEDIT","good"],contrazis:["↔️ SE CONTRAZICE","tbWarn"],"n-am-aflat":["❔ N-AM AFLAT","mutedInfo"]};
  var g=function(x){return x?P(x.pePlus)+' pe plus <span class="tbSub">(IC '+(x.ic?P(x.ic[0])+' – '+P(x.ic[1]):"—")+', mediana '+P(x.mediana)+', '+x.nEf+' ferestre independente)</span>':"—"};
  var pp=function(o,k){return P(o&&o[k]&&o[k].pePlus)};
  box.innerHTML='<p class="grNota">Un grid NEUTRU standard, simulat pe fiecare fereastră de 2 zile, cu condițiile știute la pornire. „Dovedit” = aceeași diferență pe primele 2/3 și pe ultima treime (nevăzută), iar intervalele nu se ating. Altfel: n-am aflat — nu înseamnă că nu există, ci că datele nu ajung.</p>'+L.intrebari.map(function(q){var v=V[q.verdict]||V["n-am-aflat"];return '<div class="grLab"><b>'+escapeHtml(q.titlu)+'</b> <span class="'+v[1]+'">'+v[0]+'</span><div>'+escapeHtml(q.eticheteA)+': '+g(q.A)+'</div><div>'+escapeHtml(q.eticheteB)+': '+g(q.B)+'</div><div class="tbSub">pe zilele de alegere: '+pp(q.alegere,"A")+' vs '+pp(q.alegere,"B")+' · pe cele nevăzute: '+pp(q.nevazut,"A")+' vs '+pp(q.nevazut,"B")+'</div></div>'}).join("");
}
function gridClasamentAlege(simbol){if($("grMoneda"))$("grMoneda").value=String(simbol||"").replace(/_USDT_PERP$/,"");gridCalculeaza('fortat');if($("grFisa"))$("grFisa").scrollIntoView({behavior:"smooth",block:"start"})}
function renderGridClasament(){
  var box=$("grClasament"),sub=$("grClasamentSub");if(!box)return;
  var c=grClasament.date,P=GridCalcul.procent;
  if(grClasament.eroare){box.innerHTML='<p class="tbSub">'+escapeHtml(grClasament.eroare)+'</p>';return}
  if(!c||!Array.isArray(c.monede)||!c.monede.length){box.innerHTML='<p class="tbSub">Încă nu e socotit: colectorul de acasă îl face la prima oră după pornire (PORNESTE-CRYPTO-RADAR.bat).</p>';return}
  var l=GridClasament.ordoneaza(c.monede),rz=GridClasament.rezumat(c),vechi=Date.now()-c.la>2*3600000;
  if(sub)sub.textContent="socotit acasă la "+new Date(c.la).toLocaleTimeString("ro-RO",{hour:"2-digit",minute:"2-digit"})+(vechi?" (VECHI)":"")+" · "+rz.evita+" de evitat · "+rz.candidati+" candidați · "+rz.faraDate+" fără date";
  var h='<p class="grNota">Nu e fișa: e o sită pe lumânări de 4h. Cele de EVITAT sunt în mișcare (după mișcare gridul iese cel mai rău). Candidații sunt ordonați după cât ar putea aduce gridul pe zi (profit pe grilă × traversări estimate). Apasă pe monedă ⇒ fișa întreagă, cu proba.</p><div class="grTabelWrap"><table class="grTabel"><thead><tr><th>Moneda</th><th>Stare</th><th>Mișcare 4h / 24h</th><th>Direcție</th><th>Lățime 2z</th><th>Grile · pas</th><th>Grid/zi est.</th><th>Volum 24h</th></tr></thead><tbody>';
  l.slice(0,60).forEach(function(m){
    var st=m.stare==="evita"?["🔴 EVITĂ","bad"]:m.stare==="candidat"?["🟢 candidat","good"]:["⚪ fără date","mutedInfo"];
    var rg=m.regim&&m.regim.r4h!=null?m.regim.r4h.toFixed(1).replace(".",",")+"× / "+(m.regim.r24h!=null?m.regim.r24h.toFixed(1).replace(".",","):"—")+"×":"—";
    h+='<tr><td><button type="button" class="actionGhost grCopy" value="'+escapeHtml(m.simbol)+'" data-action-click="gridClasamentAlege(this.value)">'+escapeHtml(String(m.simbol).replace(/_USDT_PERP$/,""))+'</button></td><td class="'+st[1]+'">'+st[0]+'</td><td>'+escapeHtml(rg)+'</td><td>'+escapeHtml(m.dir?(GR_DIR[m.dir]||m.dir)+(m.tarie?" ("+m.tarie+")":""):"—")+'</td><td>'+(m.latime!=null?P(m.latime):"—")+'</td><td>'+(m.grile!=null?m.grile+" · "+P(m.pas):"—")+'</td><td>'+(m.scor!=null?P(m.scor):"—")+'</td><td>'+(m.volum!=null?Math.round(m.volum/1000).toLocaleString("ro-RO")+" k":"—")+'</td></tr>';
  });
  box.innerHTML=h+'</tbody></table></div>';
}
// v79.3: "linistea de acum, cat mai tine?" - frecventa din perioadele de liniste ale monedei (nu predictie)
function grLinisteTine(f){
  var l=f.liniste,P=GridCalcul.procent;if(!l)return "";
  var z=function(x){return x.toFixed(1).replace(".",",")};
  if(!l.linisteAcum)return '<li>Pe 24 h moneda e în <b>mișcare</b> acum: nu e o liniște de măsurat.</li>';
  if(!l.suficient)return '<li>Liniște de <b>'+z(l.zileLiniste)+' zile</b> (pe 24 h). În ultimele 30 de zile doar '+l.n+' perioade au ajuns la lungimea asta: prea puține ca să spun cât mai ține.</li>';
  return '<li>Liniște de <b>'+z(l.zileLiniste)+' zile</b> (pe 24 h). Din <b>'+l.n+'</b> perioade de liniște ale monedei care au ajuns aici, <b>'+l.k+'</b> au mai ținut încă '+l.H+' zile: <b>'+P(l.p)+'</b> (IC '+P(l.ic[0])+' – '+P(l.ic[1])+'). E o frecvență din trecut, nu o promisiune.</li>';
}
// ===== v81: Jurnalul de trade - botii de grid inchisi (logica pura in lib/jurnal-trade.js) =====
var jtStare={boti:null,la:0,inLucru:false,eroare:null};
function jtNote(){try{var v=JSON.parse(localStorage.getItem("jtNote")||"{}");return v&&typeof v==="object"?v:{}}catch(e){return {}}}
function jtNotaSalveaza(id,text){var n=jtNote();if(String(text||"").trim())n[id]=String(text).slice(0,1000);else delete n[id];try{localStorage.setItem("jtNote",JSON.stringify(n))}catch(e){}}
function jtNota(el){if(!el)return;jtNotaSalveaza(el.getAttribute("data-id"),el.value);toast("Notița e salvată","good")}
// dispecerul data-action-* nu primeste elementul (doar this.value) - notita are nevoie si de id
document.addEventListener("change",function(e){var t=e.target;if(t&&t.classList&&t.classList.contains("jtNota"))jtNota(t)});
async function jtPorneste(forta){
  if(jtStare.inLucru)return;
  if(!forta&&jtStare.boti&&Date.now()-jtStare.la<5*60000){jtRender();return}
  jtStare.inLucru=true;if($("jtStare"))$("jtStare").textContent="aduc boții închiși din Pionex…";
  try{
    var d=await getJSON("/api/bot-orders?status=finished&limit=100");
    // ruta intoarce botii normalizati, cu forma bruta a Pionex in .brut
    jtStare.boti=d&&Array.isArray(d.bots)?d.bots.map(function(b){return b.brut||b}):null;jtStare.eroare=jtStare.boti?null:"Pionex nu a dat lista";
  }catch(e){jtStare.eroare=grTextEroare(e)}
  jtStare.inLucru=false;jtStare.la=Date.now();jtRender();
}
function jtRender(){
  var box=$("jtRezumat"),gr=$("jtGreseli"),li=$("jtLista"),st=$("jtStare");if(!box)return;
  if(jtStare.eroare){box.innerHTML='<div class="tbBloc"><p class="bad">'+escapeHtml(jtStare.eroare)+'</p></div>';return}
  var l=JurnalTrade.din(jtStare.boti||[]),r=JurnalTrade.rezumat(l),P=GridCalcul.procent;
  var U=function(v){return v==null?"—":(v>=0?"+":"−")+Math.abs(v).toFixed(2)+" USDT"},cls=function(v){return v==null?"":v>=0?"good":"bad"};
  if(st)st.textContent=l.length+" boți închiși · citit la "+new Date(jtStare.la).toLocaleTimeString("ro-RO",{hour:"2-digit",minute:"2-digit"});
  if(!l.length){box.innerHTML='<div class="emptyState">Niciun bot închis în Pionex.</div>';gr.innerHTML=li.innerHTML="";return}
  var cel=function(et,v,c,sub){return '<div class="tbKpiCel"><span class="tbEt2">'+escapeHtml(et)+'</span><b class="tbKpiVal '+(c||"")+'">'+escapeHtml(v)+'</b>'+(sub?'<span class="tbSub">'+escapeHtml(sub)+'</span>':"")+'</div>'};
  box.innerHTML='<div class="tbKpi jtKpi">'+cel("Rezultat total",U(r.total),cls(r.total),r.n+" boți, "+r.pePlus+" pe plus ("+P(r.pePlus/r.n)+")")+cel("Din grile",U(r.grile),cls(r.grile),"ce a făcut gridul")+cel("Din poziție",U(r.pozitie),cls(r.pozitie),"direcția prețului")+cel("Comisioane + funding",U(r.comisioane+r.funding),"bad","investit mediu "+(r.investitMediu!=null?r.investitMediu.toFixed(0):"—")+" USDT")+'</div>';
  gr.innerHTML=r.greseli.length?'<div class="grTabelWrap"><table class="grTabel"><thead><tr><th>Greșeala</th><th>De câte ori</th><th>Rezultatul boților cu ea</th><th>Ce aș face data viitoare</th></tr></thead><tbody>'+r.greseli.map(function(g){return '<tr><td><b>'+escapeHtml(g.titlu)+'</b></td><td>'+g.n+'</td><td class="'+cls(g.cost)+'">'+U(g.cost)+'</td><td class="jtSfat">'+escapeHtml(g.dataViitoare)+'</td></tr>'}).join("")+'</tbody></table></div>'+(r.greseli[0]&&r.greseli[0].cost<0?'<p class="tbFac">👉 <b>Ce aș face eu:</b> încep cu „'+escapeHtml(r.greseli[0].titlu)+'” — a costat '+U(r.greseli[0].cost)+' pe '+r.greseli[0].n+' boți.</p>':''):'<p class="good">Nicio greșeală găsită automat.</p>';
  var note=jtNote(),data=function(t){return new Date(t).toLocaleString("ro-RO",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})};
  li.innerHTML=l.map(function(t){
    var dur=t.durataOre<1?Math.round(t.durataOre*60)+" min":t.durataOre.toFixed(1).replace(".",",")+" h";
    return '<div class="jtTrade"><div class="jtCap"><b>'+escapeHtml(t.moneda)+'</b> <span class="tbSub">'+escapeHtml(t.dir+" "+(t.levier||"?")+"× · "+(t.investit!=null?t.investit.toFixed(0):"?")+" USDT · "+data(t.pornit)+" → "+data(t.inchis)+" ("+dur+")")+'</span><b class="jtRez '+cls(t.rezultat)+'">'+U(t.rezultat)+(t.pct!=null?' <span class="tbSub">'+P(t.pct)+'</span>':'')+'</b></div>'
      +'<div class="tbSub">grile '+U(t.grile)+' · poziție '+U(t.pozitie)+' · comisioane '+U(t.comisioane)+' · funding '+U(t.funding)+' · interval '+escapeHtml(t.jos+" – "+t.sus+", "+t.grileN+" grile "+t.mod)+(t.pasNet!=null?", "+P(t.pasNet)+" net/grilă":"")+'</div>'
      +(t.greseli.length?'<ul class="jtGreseli">'+t.greseli.map(function(g){return '<li><b>'+escapeHtml(g.titlu)+':</b> '+escapeHtml(g.text)+'</li>'}).join("")+'</ul>':'<p class="tbSub good">fără greșeli găsite automat</p>')
      +'<textarea class="jtNota" data-id="'+escapeHtml(t.id)+'" rows="2" placeholder="De ce am intrat, ce am simțit, ce aș face altfel…">'+escapeHtml(note[t.id]||"")+'</textarea></div>';
  }).join("");
}
function renderGrid(){
  var box=$("grFisa"),stare=$("grStare");if(!box)return;
  if(stare)stare.textContent=grStare.inLucru?"calculez… (aduc ~30 de zile de lumânări)":grStare.la?("calculat la "+new Date(grStare.la).toLocaleTimeString("ro-RO",{hour:"2-digit",minute:"2-digit"})+" · se reface singur la 5 min"):"futures grid Pionex · calcul + probă pe ultimele ~30 de zile";
  if(grStare.eroare){box.innerHTML='<div class="tbBloc"><p class="bad">'+escapeHtml(grStare.eroare)+'</p></div>';return}
  var f=grStare.fisa;
  if(!f){if(!grStare.inLucru)box.innerHTML='<div class="emptyState">Scrie o monedă (de exemplu MET) și suma. Fișa se recalculează singură la 5 minute cât stă deschisă.</div>';return}
  var st=f.setare,i=f.info,P=GridCalcul.procent,niv=GR_NIVEL[f.verdict.nivel]||GR_NIVEL["fara-date"],mot=f.verdict.motive;
  var h='<div class="grVerdict '+niv[1]+'"><span class="grVEt">'+niv[0]+'</span><div><p class="grVMotiv">'+escapeHtml(mot[0]||"e liniște, iar proba pe istoric a ieșit pe plus, fără lichidări")+'</p>'+(mot.length>1?'<ul class="grLista">'+mot.slice(1).map(function(m){return "<li>"+escapeHtml(m)+"</li>"}).join("")+'</ul>':"")+'</div></div>';
  h+='<p class="grPornit"><button type="button" class="actionGhost" data-action-click="gridJurnalAdauga()">📒 Am pornit botul cu setarea asta</button> <span class="tbSub">se ține minte fișa; rezultatul real vine din Pionex</span></p>';
  h+='<div class="tbRand"><div class="tbBloc"><div class="tbBlocCap"><h4>Direcția</h4><span class="tbSub">'+(f.manual?"aleasă de tine":"din trend")+'</span></div><p class="grDir">'+GR_DIR[f.dir]+(f.manual?"":' <span class="tbSub">tăria: '+escapeHtml(f.directie.tarie)+'</span>')+'</p><ul class="grLista">'+f.directie.motive.map(function(m){return "<li>"+escapeHtml(m)+"</li>"}).join("")+'</ul>'
    +(f.contra?'<p class="tbWarn">'+(f.manual?"Ai ales ":"Trendul zice ")+GR_DIR[f.contra.fisa]+', dar pe istoric a ieșit mai bine '+GR_DIR[f.contra.proba]+'. Uită-te la tabelul probei și alege tu.</p>':"")+'</div>';
  h+='<div class="tbBloc"><div class="tbBlocCap"><h4>Setările de pus în Pionex</h4><span class="tbSub">Futures Grid · '+escapeHtml(f.simbol.replace(/_USDT_PERP$/,""))+'/USDT</span></div>'
    +grRand("Direcție",GR_DIR_PIONEX[f.dir],GR_DIR_PIONEX[f.dir])
    +grRand("Preț de jos",grPret(st.jos,i),grPret(st.jos,i))
    +grRand("Preț de sus",grPret(st.sus,i),grPret(st.sus,i))
    +grRand("Număr de grile",st.grile+" · alege „Geometric” în Pionex (implicit e aritmetic)"+(st.redus?" · redus de la "+st.redus.de+", ca să încapă minimul pe ordin":""),String(st.grile))
    +grRand("Levier",st.levier+"×"+(st.pesteSigur?" (peste sigur: "+st.levierSigur+"×)":""),String(st.levier))
    +grRand("Investiție",st.suma+" USDT",String(st.suma))
    +(f.dir!=="short"?grRand("Stop-loss jos",grPret(st.stop.jos,i),grPret(st.stop.jos,i)):"")
    +(f.dir!=="long"?grRand("Stop-loss sus",grPret(st.stop.sus,i),grPret(st.stop.sus,i)):grRand("Take-profit sus (oprire)",grPret(st.stop.sus,i),grPret(st.stop.sus,i)))
    +grRand("Pentru TradingView (GRID-FISA)","liniile din fișă, pe grafic",grCodTV(st,i))
    +'</div></div>';
  var lj=st.lichidare.jos,ls=st.lichidare.sus;
  h+='<div class="tbRand"><div class="tbBloc"><div class="tbBlocCap"><h4>Ce înseamnă în bani</h4></div>'
    +grRand("Pasul grilei",P(st.pas))+grRand("Profit pe grilă, după comision",P(st.profitGrila)+" ≈ "+(st.perOrdin*st.profitGrila).toFixed(3)+" USDT")
    +grRand("Pe fiecare ordin",st.perOrdin.toFixed(2)+" USDT"+(st.redus?" (minim Pionex "+st.redus.minOrdin.toFixed(2)+")":i&&i.minNotional?" (minim Pionex "+i.minNotional+" USDT"+(Number(i.minSizeLimit)>0?" sau "+i.minSizeLimit+" "+escapeHtml(i.baseCurrency||""):"")+")":""))
    +grRand("Lichidare jos",lj!=null?grPret(lj,i)+" · "+P((st.jos-lj)/st.jos)+" sub grid":"nu se lichidează jos")
    +grRand("Lichidare sus",ls!=null?grPret(ls,i)+" · "+P((ls-st.sus)/st.sus)+" peste grid":"nu se lichidează sus")
    +grRandSumaMaxima(f)
    +'</div>';
  var pr=f.proba,cel=function(x,k){if(!x||x[k]==null)return "—";return k==="lichidari"?String(x[k]):k==="opriri"?x[k]+"/"+x.n:k==="iesiriMedii"?x[k].toFixed(1).replace(".",","):P(x[k])};
  h+='<div class="tbBloc"><div class="tbBlocCap"><h4>Proba pe ultimele '+Math.floor(pr.zile)+' zile</h4><span class="tbSub">'+pr.ferestre.antren+'+'+pr.ferestre.test+' ferestre de '+pr.H+'z, ~'+pr.ferestre.independente+' independente</span></div><div class="grTabelWrap"><table class="grTabel"><thead><tr><th></th>'
    +["long","neutru","short"].map(function(d){return '<th'+(d===f.dir?' class="grAles"':"")+'>'+GR_DIR[d]+(d===pr.recomandata?" ⭐":"")+'</th>'}).join("")+'</tr></thead><tbody>'
    +[["Mediana (zilele de alegere)","antren","mediana"],["Cea mai proastă fereastră","antren","ceaMaiProasta"],["De câte ori a lovit stopul","antren","opriri"],["Ieșiri din interval, pe fereastră","antren","iesiriMedii"],["Lichidări","antren","lichidari"],["Mediana pe zilele nevăzute","test","mediana"],["Lichidări pe zilele nevăzute","test","lichidari"]].map(function(r){return '<tr><th>'+r[0]+'</th>'+["long","neutru","short"].map(function(d){return '<td>'+cel(pr.pe[d][r[1]],r[2])+'</td>'}).join("")+'</tr>'}).join("")
    +'</tbody></table></div><p class="grNota">⭐ = cea mai bună pe istoric (platou, nu vârf). Aleasă pe primele 2/3 din zile, verificată pe ultima 1/3.</p></div></div>';
  var rg=f.regim;
  h+='<div class="tbBloc"><div class="tbBlocCap"><h4>Când îl oprești</h4></div><ul class="grLista">'
    +'<li>Stop-urile de mai sus sunt la două grile dincolo de marginile gridului, înaintea lichidării.</li>'
    +grLinisteTine(f)
    +'<li>Când alertele Radarului anunță «gata liniștea», oprește-l: după mișcare gridul iese cel mai rău.</li>'
    +(rg&&rg.r4h!=null&&rg.r24h!=null?'<li>Acum: mișcarea pe 4h e '+rg.r4h.toFixed(1).replace(".",",")+'× cea obișnuită, pe 24h '+rg.r24h.toFixed(1).replace(".",",")+'×; peste 1,5× înseamnă mișcare.</li>':"")
    +'</ul><p class="grNota">Nu e o promisiune: e un calcul și proba lui pe istoricul monedei. Gridul a ieșit în medie pe minus când l-am măsurat pe 30 de monede; ce s-a dovedit e să nu-l pornești după mișcare.</p></div>';
  box.innerHTML=h;
}

function tbPanouVizibil(){return !!($("tabloubot")&&$("tabloubot").classList.contains("on"))}
// Cadenta REALA cu care ruleaza colectorul acum (nu o recalculare pe hartie) -
// masurabila din proba, ca sa nu ramana o garda oarba pe un camp sters.
function tbCadentaMs(){return tbColectorPas}
function tbColectorTick(){
  // tbAduDate NU scrie in istoric daca ruta a picat - purtarea aia ramane.
  return tbAduDate().then(function(){if(tbPanouVizibil())renderTabloBot()});
}
function tbColectorPornitCuPas(pas){
  if(tbColector)clearInterval(tbColector);
  tbColectorPas=pas;
  tbColector=setInterval(function(){
    if(document.hidden)return;                       // tab in fundal: nu batem ruta degeaba
    var cerut=tbPanouVizibil()?8000:60000;
    if(cerut!==tbColectorPas){tbColectorPornitCuPas(cerut);return}
    tbColectorTick();
  },pas);
}
function tbColectorPornit(){
  if(tbColector)return;
  tbColectorPornitCuPas(tbPanouVizibil()?8000:60000);
  // v75: o citire IMEDIATA - altfel banda de sus si piata botului asteptau un
  // minut intreg dupa deschiderea aplicatiei.
  if(!document.hidden)tbColectorTick();
}
function tbColectorOprit(){if(tbColector){clearInterval(tbColector);tbColector=null;tbColectorPas=0}}
// Recalculeaza IMEDIAT cadenta ceruta de vizibilitatea panoului - fara sa
// astepte urmatorul tic (care ar putea intarzia pana la 60 s la intrare).
// Chemata din porneTabloBot()/opresteTabloBot(), ca intrarea/iesirea de pe
// panou sa se vada pe loc in ritmul colectorului, nu doar la urmatorul tic.
function tbColectorRecadenteaza(){
  if(!tbColector)return;
  var cerut=tbPanouVizibil()?8000:60000;
  if(cerut!==tbColectorPas)tbColectorPornitCuPas(cerut);
}
document.addEventListener("visibilitychange",function(){
  if(document.hidden)tbColectorOprit();else tbColectorPornit();
});
function tbNivelClasa(nivel){
  if(nivel==="OPRESTE"||nivel==="PAZESTE"||nivel==="EROARE")return "bad";
  if(nivel==="OPORTUNITATE"||nivel==="LINISTE")return "good";
  if(nivel==="REGLEAZA")return "tbWarn";
  if(nivel==="OPRIT")return "tbOprit";
  return "mutedInfo";
}
// Unitatea vine din modul (Task 2): valoarea e DEJA in unitatea afisata
// (comisionul ca procent, nu fractie) - aici doar o lipim de cifra.
function tbCuUnitate(text,unitate){
  if(!unitate||text==="\u2014"||text==="—")return text;
  return unitate==="%"||unitate==="\u00d7"?text+unitate:text+" "+unitate;
}
// ===== F5: grile sau directie? - din umplerile REALE ale botului (logica pura in lib/grid-umpleri.js) =====
// Se aduc rar (10 min): fiecare pagina e o cerere privata la Pionex, iar 429 racoreste toata ruta.
var tbUmpleri={botId:null,la:0,inLucru:false,eroare:null,randuri:null,trunchiat:false};
var TB_UMPLERI_MS=10*60000,TB_UMPLERI_PAGINI=12;
function tbUmpleriPosibile(b){return !!(b&&b.id&&b.pornitLa>0&&!/PERP$/i.test(String(b.baza||"")))}
async function tbAduUmpleri(b){
  // VERIFICAT 24.09 pe contul lui: /api/v1/trade/fills refuza simbolurile PERP ("symbol error") -
  // umplerile botilor futures nu se pot citi prin API-ul de citire. Se incearca doar la boti spot.
  if(!tbUmpleriPosibile(b))return;
  if(tbUmpleri.inLucru)return;
  if(tbUmpleri.botId===b.id&&Date.now()-tbUmpleri.la<(tbUmpleri.eroare?60000:TB_UMPLERI_MS))return;
  tbUmpleri.inLucru=true;
  try{
    var s=TabloBot.simboluri(b.baza,b.quote).pionex,randuri=[],end=Date.now(),trunchiat=false;
    for(var p=0;p<TB_UMPLERI_PAGINI;p++){
      var d=await getJSON("/api/pionex-account?action=fills&symbol="+encodeURIComponent(s)+"&limit=100&startTime="+Math.floor(b.pornitLa)+"&endTime="+Math.floor(end));
      var r=d&&d.data&&(Array.isArray(d.data.fills)?d.data.fills:Array.isArray(d.data)?d.data:null);
      if(!r)throw Error((d&&(d.error||d.detail||d.message))||"Pionex nu a dat umplerile");
      randuri=randuri.concat(r);
      if(r.length<100)break;
      var t=r.map(function(x){return Number(x&&x.timestamp)}).filter(Number.isFinite);
      if(!t.length)break;
      end=Math.min.apply(null,t)-1;
      if(p===TB_UMPLERI_PAGINI-1)trunchiat=true;
      await grPauza(400);
    }
    tbUmpleri={botId:b.id,la:Date.now(),inLucru:false,eroare:null,randuri:randuri,trunchiat:trunchiat};
  }catch(e){tbUmpleri={botId:b.id,la:Date.now(),inLucru:false,eroare:textEroare(e),randuri:null,trunchiat:false}}
  if(tbPanouVizibil()&&tbStare.bot&&tbStare.bot.id===b.id)tbDeseneazaBanii(tbStare.bot);
}
function tbRandUmpleri(b){
  var u=tbUmpleri,rand=function(et,val,cls,nota){return '<div class="tbLinie"><span>'+escapeHtml(et)+(nota?' <span class="tbSub">'+escapeHtml(nota)+'</span>':'')+'</span><b class="'+(cls||"")+'">'+escapeHtml(val)+'</b></div>'};
  if(!tbUmpleriPosibile(b))return rand("Din grile / din direcție","Pionex nu dă umplerile boților futures prin API-ul de citire","tbSubVal","verificat 24.09: trade/fills refuză PERP");
  if(u.botId!==b.id)return rand("Din grile / din direcție",u.inLucru?"citesc umplerile…":"—","tbSubVal","din umplerile reale");
  if(u.eroare)return rand("Din grile / din direcție","nu pot citi umplerile: "+u.eroare,"tbSubVal");
  var bu=b.brut&&b.brut.buOrderData||{},tip=String(bu.gridType||"").toLowerCase();
  var g={jos:Number(b.gridJos),sus:Number(b.gridSus),grile:Number(bu.row)||0,dir:String(b.directie||"neutru").toLowerCase(),pornitLa:b.pornitLa,mod:tip==="arithmetic"?"aritmetic":tip==="geometric"?"geometric":"auto",trunchiat:u.trunchiat};
  var pret=Number.isFinite(Number(b.pretCurent))&&b.pretCurent!=null&&b.pretCurent!==""?Number(b.pretCurent):null;
  var r=GridUmpleri.imparte(GridUmpleri.citeste(u.randuri),g,pret);
  if(r.motiv)return rand("Din grile / din direcție",r.motiv,"tbSubVal");
  if(!r.umpleri)return rand("Din grile / din direcție","nicio umplere de la pornire","tbSubVal");
  var dirTot=r.nerealizat==null?null:r.directieRealizat+r.nerealizat;
  return rand("Din grile",botiBan(r.grile),botiClasa(r.grile),r.laNivel+" umpleri la nivel · grid "+r.mod)
    +rand("Din direcție",botiBan(dirTot),botiClasa(dirTot),"pornire "+botiBan(r.directieRealizat)+" + deschis "+botiBan(r.nerealizat))
    +rand("Comisioane pe umpleri",botiBan(-r.comisioane),"tbSubVal",r.umpleri+" umpleri");
}
// ===== v80: cinci randuri noi in Tablou (logica pura in lib/tablou-extra.js) =====
var tbFisa={botId:null,la:0,inLucru:false,fisa:null,eroare:null};
async function tbAduFisaBot(b){
  if(!b||!b.id||tbFisa.inLucru)return;
  if(tbFisa.botId===b.id&&Date.now()-tbFisa.la<(tbFisa.eroare?2*60000:10*60000))return;
  tbFisa.inLucru=true;
  try{
    var simbol=TabloBot.simboluri(b.baza,b.quote).pionex;
    await grAduMonede();
    // refoloseste lumanarile aduse de fereastra Grid pentru aceeasi moneda (sub 10 min): 8 cereri Pionex mai putin
    var d=grStare.date&&grStare.simbol===simbol&&Date.now()-grStare.la<10*60000?grStare.date:await grAduLumanari(simbol),info=grStare.monede&&grStare.monede[simbol];
    if(!(grStare.date&&grStare.simbol===simbol)){grStare.date=d;grStare.simbol=simbol;grStare.la=Date.now()}
    var f=GridProba.fisa({simbol:simbol,pret:GridCalcul.pretCurent(d.r15),b15:GridCalcul.bare(d.r15),b4h:GridCalcul.bare(d.r4),b1d:GridCalcul.bare(d.r1),
      suma:botiNr(b.investit)||100,H:2,dir:null,levier:null,minNotional:info?Number(info.minNotional):null,minSize:info?Number(info.minSizeLimit):null});
    tbFisa={botId:b.id,la:Date.now(),inLucru:false,fisa:f.eroare?null:f,eroare:f.eroare||null};
  }catch(e){tbFisa={botId:b.id,la:Date.now(),inLucru:false,fisa:null,eroare:grTextEroare(e)}}
  if(tbPanouVizibil()&&tbStare.bot&&tbStare.bot.id===b.id){tbDeseneazaExtra(tbStare.bot);if(typeof renderTabloSfaturi==="function")renderTabloSfaturi()}
}
// ===== v81: saptamana, planul, marja, vs pozitie, evenimente =====
var tbSapt={botId:null,la:0,intrari:null,eroare:null,inLucru:false},tbPlan={botId:null,plan:null,la:0};
async function tbAduSaptamana(b){
  if(!b||!b.id||tbSapt.inLucru||(tbSapt.botId===b.id&&Date.now()-tbSapt.la<10*60000))return;
  tbSapt.inLucru=true;
  try{var d=await getJSON("/api/istoric-bot?action=citeste&ore=168&bot="+encodeURIComponent(b.id));tbSapt={botId:b.id,la:Date.now(),intrari:Array.isArray(d.intrari)?d.intrari:[],eroare:null,inLucru:false}}
  catch(e){tbSapt={botId:b.id,la:Date.now(),intrari:null,eroare:e&&e.status===503?"doar pe Radarul de acasă":textEroare(e),inLucru:false}}
  try{var p=await getJSON("/api/istoric-bot?action=plan&bot="+encodeURIComponent(b.id));tbPlan={botId:b.id,plan:p&&p.plan||null,la:Date.now()};tbPlanInForm()}catch(e){}
  if(tbPanouVizibil()&&tbStare.bot&&tbStare.bot.id===b.id)tbDeseneazaSaptPlan(tbStare.bot);
}
function tbPlanInForm(){var p=tbPlan.plan||{};[["tbPlanPlus","plus"],["tbPlanMinus","minus"],["tbPlanAfara","afaraOre"]].forEach(function(x){var e=$(x[0]);if(e&&!e.value&&p[x[1]]!=null)e.value=String(p[x[1]])})}
async function tbPlanSalveaza(){
  var b=tbStare.bot;if(!b)return;
  var plan={plus:grNumar($("tbPlanPlus")&&$("tbPlanPlus").value),minus:grNumar($("tbPlanMinus")&&$("tbPlanMinus").value),afaraOre:grNumar($("tbPlanAfara")&&$("tbPlanAfara").value)};
  try{var r=await apiFetch("/api/istoric-bot?action=plan",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({bot:b.id,plan:plan})});var d=await r.json();
    if(!r.ok)throw Object.assign(new Error(d&&d.error||("HTTP "+r.status)),{status:r.status});
    tbPlan={botId:b.id,plan:d.plan,la:Date.now()};toast("Planul e salvat; colectorul te anunță când atingi un prag","good")}
  catch(e){toast("Nu am putut salva planul: "+(e&&e.status===503?"doar pe Radarul de acasă":textEroare(e)),"bad")}
  tbDeseneazaSaptPlan(b);
}
function tbMarjaCalc(v){
  var b=tbStare.bot,el=$("tbMarjaRez");if(!el)return;var P=GridCalcul.procent;
  var r=b?TabloExtra.marjaNoua(b,grNumar(v)):null;
  if(!r){el.innerHTML='<p class="tbSub">'+(b&&b.directie!=="long"&&b.directie!=="short"?"La grid neutru lichidarea are două părți; nu socotesc.":"Scrie o sumă mai mare ca 0.")+'</p>';return}
  el.innerHTML='<div class="tbLinie"><span>Lichidarea acum</span><b>'+escapeHtml(grPret(r.inainte,null))+'</b></div><div class="tbLinie"><span>Cu +'+escapeHtml(String(grNumar(v)))+' USDT marjă</span><b class="good">'+escapeHtml(grPret(r.lichidare,null))+(r.distantaPct!=null?' <span class="tbSub">('+P(r.distantaPct)+' de preț)</span>':'')+'</b></div><p class="tbSub">Aproximare: marja izolată în plus împinge lichidarea cu suma / poziție. Pionex poate rotunji puțin altfel.</p>';
}
function tbDeseneazaSaptPlan(b){
  var el=$("tbSapt"),ps=$("tbPlanStare"),P=GridCalcul.procent;if(!el||!ps)return;
  if(!b){el.innerHTML=ps.innerHTML='<p class="tbSub">Fără bot citit.</p>';return}
  // (1) saptamana
  if(tbSapt.botId!==b.id)el.innerHTML='<p class="tbSub">aduc istoricul de 7 zile…</p>';
  else if(tbSapt.eroare)el.innerHTML='<p class="tbSub">'+escapeHtml(tbSapt.eroare)+'</p>';
  else{
    var z=TabloExtra.peZile(tbSapt.intrari||[],"Europe/Bucharest");
    if(!z.length)el.innerHTML='<p class="tbSub">Colectorul n-a strâns încă istoric pentru botul ăsta.</p>';
    else{var mx=Math.max.apply(null,z.map(function(x){return Math.abs(x.grile||0)}).concat([0.01]));
      el.innerHTML='<div class="tbZile">'+z.map(function(x){var h=x.grile==null?0:Math.round(Math.abs(x.grile)/mx*100);return '<div class="tbZi" title="'+escapeHtml(x.zi)+'"><span class="tbSub">'+(x.grile==null?"—":(x.grile>=0?"+":"−")+Math.abs(x.grile).toFixed(2))+'</span><i class="'+(x.grile!=null&&x.grile<0?"neg":"poz")+'" style="height:'+h+'%"></i><span class="tbEt2">'+escapeHtml(x.zi.slice(8,10)+"."+x.zi.slice(5,7))+'</span><span class="tbSub '+(x.total==null?"":x.total>=0?"good":"bad")+'">'+(x.total==null?"—":(x.total>=0?"+":"−")+Math.abs(x.total).toFixed(1))+'</span></div>'}).join("")+'</div><p class="tbSub">Bara = cât au adus grilele în ziua aceea; dedesubt, totalul botului seara. Din istoricul strâns de colectorul de acasă (7 zile).</p>';}
  }
  // (3) planul
  var st=TabloExtra.planStare(b,tbPlan.botId===b.id?tbPlan.plan:null,{afaraDe:null},Date.now());
  if(!st||(!st.plus&&!st.minus&&!st.afara)){ps.innerHTML='<p class="tbSub">Niciun plan încă. Scrie-l acum, la rece: e mai ușor decât să hotărăști când prețul fuge.</p>';return}
  var U=function(v){return (v>=0?"+":"−")+Math.abs(v).toFixed(2)+" USDT"},h="";
  if(st.plus)h+='<div class="tbLinie"><span>Țintă pe plus: '+U(st.plus.prag)+'</span><b class="'+(st.plus.lipsa<=0?"good":"")+'">'+(st.plus.lipsa<=0?"ATINSĂ — ieși":"mai sunt "+st.plus.lipsa.toFixed(2)+" USDT")+'</b></div>';
  if(st.minus)h+='<div class="tbLinie"><span>Ies dacă pierd '+st.minus.prag.toFixed(2)+' USDT</span><b class="'+(st.minus.lipsa<=0?"bad":st.minus.lipsa<st.minus.prag*0.25?"tbWarn":"")+'">'+(st.minus.lipsa<=0?"ATINS — ieși":"mai sunt "+st.minus.lipsa.toFixed(2)+" USDT")+'</b></div>';
  if(st.afara)h+='<div class="tbLinie"><span>Afară din grid peste '+st.afara.prag+' ore</span><b>colectorul numără orele</b></div>';
  ps.innerHTML=h+(st.atins.length?'<p class="tbFac">👉 <b>Ce aș face eu:</b> exact ce ți-ai propus — ieși acum, fără să renegociezi.</p>':'');
}
function tbDeseneazaExtra(b){
  var el=$("tbFisaBot"),el2=$("tbAcum"),P=GridCalcul.procent;if(!el||!el2)return;
  if(!b){el.innerHTML=el2.innerHTML='<p class="tbSub">Fără bot citit.</p>';return}
  var linie=function(et,val,cls,nota){return '<div class="tbLinie"><span>'+escapeHtml(et)+(nota?' <span class="tbSub">'+escapeHtml(nota)+'</span>':'')+'</span><b class="'+(cls||"")+'">'+escapeHtml(val)+'</b></div>'};
  // 1) botul vs fisa
  var f=tbFisa.botId===b.id?tbFisa.fisa:null;
  if(tbFisa.botId===b.id&&tbFisa.eroare)el.innerHTML='<p class="tbSub">Nu pot calcula fișa pentru moneda botului: '+escapeHtml(tbFisa.eroare)+'</p>';
  else if(!f){var g0=TabloExtra.geometrieBot(b);el.innerHTML=(g0?linie("Pas net pe grilă (botul)",P(g0.netPct),g0.preaDese?"bad":"",g0.grile+" grile "+g0.mod):"")+'<p class="tbSub">calculez fișa de azi pentru moneda botului…</p>'}
  else{
    var c=TabloExtra.comparaCuFisa(b,f);
    el.innerHTML='<table class="tbCmp"><thead><tr><th></th><th>botul tău</th><th>fișa de azi</th></tr></thead><tbody>'+c.randuri.map(function(r){return '<tr><th>'+escapeHtml(r.et)+'</th><td>'+escapeHtml(r.bot)+'</td><td>'+escapeHtml(r.et==="Verdictul de azi"?((GR_NIVEL[r.fisa]||[r.fisa])[0]):r.fisa)+'</td></tr>'}).join("")+'</tbody></table>'
      +(c.semnale.length?'<ul class="tbSemnale">'+c.semnale.map(function(x){return '<li>'+escapeHtml(x)+'</li>'}).join("")+'</ul>':'<p class="tbSub">Setările botului se potrivesc cu fișa de azi.</p>')
      +'<p class="tbSub">Nu schimba botul doar pentru că diferă: fișa e pentru un bot NOU pornit acum. Deschide fereastra Grid pentru toată proba.</p>';
    if($("tbFisaBotSub"))$("tbFisaBotSub").textContent="fișa calculată la "+new Date(tbFisa.la).toLocaleTimeString("ro-RO",{hour:"2-digit",minute:"2-digit"})+" · suma botului";
  }
  // 2) pe zi  3) la inchidere  4) liniste + laborator  5) jurnal
  var z=TabloExtra.grileVsCosturi(b,Date.now()),q=TabloExtra.dacaInchizi(b),h="";
  h+=linie("Grile, ultimele 24 h",z.grile24h==null?"—":botiBan(z.grile24h),botiClasa(z.grile24h),z.umpleri24h!=null?z.umpleri24h+" tranzacții":"");
  h+=linie("Comisioane pe zi",z.comisionZi==null?"—":botiBan(z.comisionZi),"tbSubVal","medie de la pornire");
  h+=linie("Funding pe zi",z.fundingZi==null?"—":botiBan(z.fundingZi),z.fundingMananca?"bad":"tbSubVal",z.fundingMananca?"mănâncă tot câștigul din grile":"medie de la pornire");
  h+=linie("Grile − costuri, pe zi",z.netZi==null?"—":botiBan(z.netZi),botiClasa(z.netZi));
  h+='<div class="tbLinie tbLinieTotal"><span>Dacă îl închizi acum, iei</span><b class="'+botiClasa(q.iei!=null&&botiNr(b.investit)!=null?q.iei-botiNr(b.investit):null)+'">'+escapeHtml(q.iei==null?"—":q.iei.toFixed(2)+" USDT")+'</b></div>';
  h+=linie("Comisionul de închidere",q.comisionInchidere==null?"—":botiBan(-q.comisionInchidere),"tbSubVal");
  h+=linie("Prețul la care botul e pe zero",q.pretZero==null?"—":grPret(q.pretZero,null),"",q.distantaZeroPct==null?"":(q.distantaZeroPct>=0?"+":"")+P(q.distantaZeroPct)+" de aici");
  if(f&&f.liniste){var L=f.liniste;h+=linie("Liniștea (fișa)",!L.linisteAcum?"acum e mișcare":!L.suficient?"prea puține perioade":L.k+" din "+L.n+" au mai ținut 2 zile ("+P(L.p)+")",!L.linisteAcum?"tbWarn":"","frecvență, nu promisiune")}
  var lab=grLaborator&&grLaborator.date,qm=lab&&Array.isArray(lab.intrebari)?lab.intrebari.find(function(x){return x.id==="miscare"}):null;
  if(qm)h+=linie("Laboratorul: după mișcare vs liniște",P(qm.A&&qm.A.pePlus)+" vs "+P(qm.B&&qm.B.pePlus)+" pe plus",qm.verdict==="dovedit"?"good":"tbSubVal",qm.verdict==="dovedit"?"DOVEDIT":"n-am aflat încă");
  var vp=TabloExtra.vsPozitie(b);
  if(vp&&vp.pozitieSimpla!=null)h+=linie(b.directie==="long"||b.directie==="short"?"Un "+b.directie+" simplu, aceeași sumă și levier":"Fără bot (neutru)",botiBan(vp.pozitieSimpla),botiClasa(vp.pozitieSimpla),vp.diferenta!=null?"gridul "+(vp.diferenta>=0?"a adus ":"a pierdut ")+Math.abs(vp.diferenta).toFixed(2)+" față de el":"");
  var j=TabloExtra.legaturaJurnal(grJurnalCitit(),b);
  h+=j?linie("Din jurnal","pornit la "+((GR_NIVEL[j.verdict]||["?"])[0])+", proba zicea mediana "+P(j.mediana),"","acum "+(botiNr(b.profitTotal)!=null&&botiNr(b.investit)?P(botiNr(b.profitTotal)/botiNr(b.investit)):"—")):linie("Din jurnal","nelegat","tbSubVal","n-ai notat fișa la pornire");
  el2.innerHTML=h;
}
// Banii botului pe Tablou, dupa contractul rutei. Lipsa = "—", niciodata 0.
function tbDeseneazaBanii(b){
  var el=$("tbBani"),av=$("tbAvertismente");if(!el)return;
  if(!b){el.innerHTML='<div class="emptyState">—</div>';if(av)av.innerHTML='<p class="tbSub">Fără bot citit.</p>';return}
  // Lista, nu cutii: eticheta la stanga, cifra la dreapta, aliniata pe coloana.
  var rand=function(eticheta,valoare,cls,nota){return '<div class="tbLinie"><span>'+escapeHtml(eticheta)+(nota?' <span class="tbSub">'+escapeHtml(nota)+'</span>':'')+'</span><b class="'+(cls||"")+'">'+escapeHtml(valoare)+'</b></div>'};
  el.innerHTML=rand("Investit",botiBan(b.investit,2,false))+
    rand("Realizat, după comisioane",botiBan(b.profitNet),botiClasa(b.profitNet))+
    rand("Poziția deschisă",botiBan(b.pnlNerealizat)+(b.pnlNerealizatSigur===false?" (semn nesigur)":""),botiClasa(b.pnlNerealizat),"nerealizat")+
    '<div class="tbLinie tbLinieTotal"><span>Total</span><b class="'+botiClasa(b.profitTotal)+'">'+escapeHtml(botiBan(b.profitTotal))+'</b></div>'+
    rand("Profit brut din grid",botiBan(b.gridProfitBrut),"tbSubVal")+
    rand("Comisioane",botiBan(b.comisioane),"tbSubVal")+
    rand("Finanțare",botiBan(b.finantare),"tbSubVal")+
    tbRandUmpleri(b);
  tbAduUmpleri(b);
  tbDeseneazaExtra(b);tbAduFisaBot(b);tbDeseneazaSaptPlan(b);tbAduSaptamana(b);if(typeof gridLaboratorAdu==="function")gridLaboratorAdu();
  var lista=Array.isArray(b.avertismente)?b.avertismente:[];
  if(av)av.innerHTML=lista.length?lista.map(function(a){return '<div class="tbAvert">'+escapeHtml(a)+'</div>'}).join(""):'<p class="tbSub">Niciun avertisment de la server.</p>';
}
// Banda cu cele patru cifre de sus: ce se citeste dintr-o privire. Doar din
// campurile rutei (aceleasi ca in lista de boti); lipsa ramane "—".
// v77: sfaturile, scenariile de pret, istoricul de pe serverul de acasa,
// alertele pe telefon (ntfy), marja din futures si finantarea. Cifrele vin din
// modulele pure (Scenariu, Sfaturi, Alerte, Directie), probate fara browser.
var TB_EXTRA_MS=5*60000;
async function tbAduExtra(){
  var b=tbStare.bot;if(!b||!b.id)return;
  var e=tbStare.extra||(tbStare.extra={la:0,bot:null,inLucru:false});
  if(e.inLucru||(e.bot===b.id&&Date.now()-e.la<TB_EXTRA_MS))return;
  e.inLucru=true;
  try{
    // Istoricul strans de colectorul de acasa (pe pagina publicata raspunde 503 - atunci ramane cel din browser).
    try{var ist=await getJSON("/api/istoric-bot?action=citeste&ore=24&bot="+encodeURIComponent(b.id));
      tbStare.istoricServer={bot:b.id,intrari:Array.isArray(ist.intrari)?ist.intrari:[],config:ist.config||null};e.istoricEroare=null;
      // v79.1: alertele colectorului stau in KV (fara ntfy) si se vad aici
      try{var al=await getJSON("/api/istoric-bot?action=alerte");tbStare.alerteServer=al&&Array.isArray(al.alerte)?al.alerte:[]}catch(x2){tbStare.alerteServer=null}}
    catch(x){e.istoricEroare=x.status===503?"doar-acasa":textEroare(x)}
    try{var f=await getJSON("/api/pionex-account?action=futures");e.futures=f&&f.usdt?f.usdt:null;e.futuresEroare=null}
    catch(x){e.futures=null;e.futuresEroare=textEroare(x)}
    try{var baza=String(b.baza||"").replace(/\.PERP$/,"").toUpperCase();
      var fu=await getJSON("/api/market?type=futures&symbol="+encodeURIComponent(baza+"USDT"));e.funding=fu&&fu.funding!=null?Number(fu.funding):null}
    catch(x){e.funding=null}
    e.bot=b.id;e.la=Date.now();
  }finally{e.inLucru=false}
  renderTabloSfaturi();renderTabloScenarii();renderTabloAlerte();
}
function tbTinteScenariu(b){
  var t=[],p=botiNr(b.pretCurent),jos=botiNr(b.gridJos),sus=botiNr(b.gridSus),opr=botiNr(b.opritorPierdere);
  if(p!==null){t.push({eticheta:"+5%",pret:p*1.05});t.push({eticheta:"−5%",pret:p*0.95});t.push({eticheta:"−10%",pret:p*0.9})}
  if(sus!==null)t.push({eticheta:"marginea de sus",pret:sus});
  if(jos!==null)t.push({eticheta:"jos",pret:jos});
  if(opr!==null&&opr!==jos)t.push({eticheta:"opritorul",pret:opr});
  var propriu=tbStare.scenariuPropriu;if(propriu>0)t.push({eticheta:"prețul tău",pret:propriu});
  return t;
}
function tbScenariuPropriu(v){var x=Number(String(v||"").replace(",","."));tbStare.scenariuPropriu=x>0&&isFinite(x)?x:null;renderTabloScenarii()}
function renderTabloScenarii(){
  var el=$("tbScenarii");if(!el)return;
  var b=tbStare.routeOk===false?null:tbStare.bot;
  if(!b||typeof Scenariu==="undefined"){el.innerHTML='<p class="tbSub">—</p>';return}
  var r=Scenariu.scenarii(tbStare.botBrut,b,tbTinteScenariu(b));
  if(!r.ok){el.innerHTML='<p class="tbSub">'+escapeHtml(r.motiv)+'</p>';return}
  var nume={jos:"marginea de jos"};
  var randuri=r.randuri.slice().sort(function(a,c){return c.pret-a.pret});
  el.innerHTML='<div class="tbScenCap"><span>Dacă prețul ajunge la</span><span>Poziția</span><span>Totalul ar fi</span></div>'+
    randuri.map(function(x){return '<div class="tbScenRand'+(x.gol?' tbScenGol':'')+'"><span><b>'+escapeHtml(tbPretScurt(x.pret))+'</b> <span class="tbSub">'+escapeHtml(/^[+−]/.test(x.eticheta)?x.eticheta:(nume[x.eticheta]||x.eticheta)+' · '+tbFormateazaSemn(x.miscare,1)+'%')+'</span></span>'+
      '<span>'+Math.round(x.pozitie)+'</span>'+(x.gol?'<b class="bad">lichidat, ≈ −'+escapeHtml(r.grid.inv.toFixed(2))+' USDT</b>':'<b class="'+(x.total>0?"good":x.total<0?"bad":"")+'">'+escapeHtml(botiBan(x.total,2))+'</b>')+'</div>'}).join("")+
    '<p class="tbSub tbScenNota">Aproximare pe gridul tău ('+r.grid.randuri+' niveluri, câte '+r.grid.q+' pe nivel). După model, contul botului s-ar goli pe la <b>'+escapeHtml(tbPretScurt(r.pretGolire))+'</b>; Pionex estimează lichidarea la '+escapeHtml(tbPretScurt(botiNr(b.pretLichidare)))+'.</p>';
}
function renderTabloSfaturi(){
  var el=$("tbSfaturi");if(!el)return;
  var b=tbStare.routeOk===false?null:tbStare.bot;
  if(!b||typeof Sfaturi==="undefined"||typeof Scenariu==="undefined"){el.innerHTML='<p class="tbSub">Aștept botul…</p>';return}
  var d=tbStare.directie,r4=d&&d.rez?d.rez.filter(function(x){return x.tf==="4H"})[0]:null,e=tbStare.extra||{};
  var scen=Scenariu.scenarii(tbStare.botBrut,b,[{eticheta:"jos",pret:botiNr(b.gridJos)}]);
  var k4=d&&d.randuri4h,p=botiNr(b.pretCurent),jos=botiNr(b.gridJos);
  var sanse=k4&&p!==null&&jos!==null?{josZi:Scenariu.sansaAtingere(k4,p,jos,6),josSapt:Scenariu.sansaAtingere(k4,p,jos,42)}:{};
  // v80.1: ritmul botului (24 h vs media pe zi de la pornire) + fisa/costuri/zero/setare din tablou-extra
  var bu=b.brut&&b.brut.buOrderData||{},zile=botiNr(b.pornitLa)?(Date.now()-botiNr(b.pornitLa))/86400000:null;
  var ritm={grile24h:botiNr(bu.gridProfit24h),medieZi:zile&&botiNr(b.gridProfitBrut)!=null?botiNr(b.gridProfitBrut)/zile:null,tranz24h:botiNr(bu.trx24h),tranzMedieZi:zile&&botiNr(bu.closedExchangeOrderCount)!=null?botiNr(bu.closedExchangeOrderCount)/zile:null,zile:zile};
  var lista=Sfaturi.sfaturi({bot:b,scen:scen,sanse:sanse,rezumat:d&&d.rez?Directie.rezumat(d.rez,b.directie):null,
    funding:e.funding,fata4h:r4&&r4.dir?r4.fata.ton:null,dir4h:r4&&r4.dir,
    fisa:tbFisa.botId===b.id?tbFisa.fisa:null,costuri:TabloExtra.grileVsCosturi(b,Date.now()),zero:TabloExtra.dacaInchizi(b),geom:TabloExtra.geometrieBot(b),ritm:ritm});
  el.innerHTML=lista.map(function(s){return '<div class="tbSfat tbSfat-'+escapeHtml(s.ton)+'"><b>'+escapeHtml(s.titlu)+'</b><p>'+escapeHtml(s.text)+'</p>'+(s.faCe?'<p class="tbFac">👉 <b>Ce aș face eu:</b> '+escapeHtml(s.faCe)+'</p>':'')+(s.deCe?'<p class="tbSub">'+escapeHtml(s.deCe)+'</p>':'')+'</div>'}).join("");
}
function renderTabloAlerte(){
  var el=$("tbAlerteStare");if(!el)return;
  var s=tbStare.istoricServer,c=s&&s.config,e=tbStare.extra||{};
  if(e.istoricEroare==="doar-acasa"){el.innerHTML='<p class="tbSub">Alertele pe telefon și istoricul de 7 zile merg de pe serverul de acasă (PORNESTE-CRYPTO-RADAR.bat).</p>';return}
  if(!c||!c.colectorLa){el.innerHTML='<p class="tbSub">Colectorul de acasă n-a pornit încă. Pornește din nou PORNESTE-CRYPTO-RADAR.bat.</p>';return}
  var min=c.colectorLa?Math.round((Date.now()-c.colectorLa)/60000):null;
  var viu=min!==null&&min<=3;
  var canal=c.canal==="ntfy"&&c.ntfyTopic?"ntfy · canal "+c.ntfyTopic:c.canal==="telegram"?"Telegram":c.canal==="discord"?"Discord (webhook) + aici":"doar aici, în Radar (niciun canal extern legat încă)";
  var lista=Array.isArray(tbStare.alerteServer)?tbStare.alerteServer.slice(0,12):null;
  var NIV={critic:["🔴","bad"],atentie:["🟠","tbWarn"],info:["🟢","good"]};
  var h='<div class="tbLinie"><span>Colectorul de acasă</span><b class="'+(viu?"good":"bad")+'">'+(min===null?"—":viu?"merge (acum "+Math.max(0,min)+" min)":"oprit de "+min+" min")+'</b></div>'+
    '<div class="tbLinie"><span>Istoric strâns pe server</span><b>'+(s.intrari.length?Math.round((Date.now()-s.intrari[0].t)/3600000*10)/10+" ore":"—")+'</b></div>'+
    '<div class="tbLinie"><span>Canalul de alerte</span><b>'+escapeHtml(canal)+'</b></div>';
  if(lista===null)h+='<p class="tbSub">Nu pot citi alertele de pe server.</p>';
  else if(!lista.length)h+='<p class="tbSub">Nicio alertă încă. Aici apar: lichidare aproape, Pionex în stare anormală, preț ieșit din grid, piața pe 4h împotriva botului, mișcare mare.</p>';
  else h+='<div class="tbAlerteLista">'+lista.map(function(a){var n=NIV[a.nivel]||NIV.info;return '<div class="tbAlerta"><span class="tbSub">'+escapeHtml(new Date(a.t).toLocaleString("ro-RO",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}))+'</span><b class="'+n[1]+'">'+n[0]+' '+escapeHtml(a.titlu)+'</b>'+(a.mesaj?'<p class="tbSub">'+escapeHtml(a.mesaj)+'</p>':'')+'</div>'}).join("")+'</div>';
  el.innerHTML=h;
}
function tbDeseneazaKpi(){
  var b=tbStare.routeOk===false?null:tbStare.bot;
  var pune=function(id,text,cls){var e=$(id);if(!e)return;e.textContent=text;if(cls!=null)e.className=(e.classList.contains("tbKpiVal")?"tbKpiVal ":"tbSub ")+cls};
  if(!b){["tbKpiTotal","tbKpiLich","tbKpiPret","tbKpiPiata"].forEach(function(id){pune(id,"—","")});
    ["tbKpiTotalSub","tbKpiLichSub","tbKpiPretSub","tbKpiPiataSub"].forEach(function(id){pune(id,"—","")});return}
  var tot=botiNr(b.profitTotal),inv=botiNr(b.investit);
  pune("tbKpiTotal",tot===null?"—":(tot>0?"+":"")+tot.toFixed(2),botiClasa(b.profitTotal));
  pune("tbKpiTotalSub",tot!==null&&inv!==null&&inv>0?tbFormateazaSemn(100*tot/inv,2)+"% din "+inv.toFixed(2)+" investiți":"cu tot cu poziția deschisă","");
  var dist=botiNr(b.distantaLichidarePct),dep=!!b.lichidareDepasita,parte=b.lichidarePartea==="sus"?"sus":b.lichidarePartea==="jos"?"jos":null;
  var nivel=dep||(dist!==null&&Math.abs(dist)<8)?"bad":dist!==null&&Math.abs(dist)<15?"tbWarn":dist===null?"mutedInfo":"good";
  pune("tbKpiLich",dep?"DEPĂȘITĂ":dist===null?"—":Math.abs(dist).toFixed(1)+"%",nivel);
  var pl=botiNr(b.pretLichidare);
  pune("tbKpiLichSub",dist===null&&!dep?(b.motivFaraDistanta==="fara-pret"?"nu am prețul acum":"fără lichidare raportată"):
    (parte?"prețul trebuie să "+(parte==="jos"?"scadă":"crească")+" până la ":"lichidare la ")+(pl!==null?tbPretScurt(pl):"—"),"");
  var bara=$("tbKpiLichBara");
  if(bara){var f=dep?0:dist===null?0:Math.min(1,Math.abs(dist)/40);bara.style.width=(f*100).toFixed(1)+"%";bara.className="tbGaugeUmplut "+nivel}
  var p=botiNr(b.pretCurent),jos=botiNr(b.gridJos),sus=botiNr(b.gridSus);
  pune("tbKpiPret",p===null?"—":tbPretScurt(p),"");
  var poz=(p!==null&&jos!==null&&sus!==null&&sus>jos)?(p-jos)/(sus-jos):null;
  pune("tbKpiPretSub",poz===null?"fără grid citit":(poz<0?"sub grid":poz>1?"peste grid":Math.round(poz*100)+"% din interval")+" · "+tbPretScurt(jos)+" - "+tbPretScurt(sus),poz!==null&&(poz<0||poz>1)?"bad":"");
  var punct=$("tbKpiGridPunct");
  if(punct){punct.hidden=poz===null;if(poz!==null){punct.style.left=(Math.min(1,Math.max(0,poz))*100).toFixed(1)+"%";punct.className="tbGaugePunct"+(poz<0||poz>1?" bad":"")}}
  var d=tbStare.directie,z=d&&d.rez&&typeof Directie!=="undefined"?Directie.rezumat(d.rez,b.directie):null;
  if(!z||z.ton==="nu-se-poate"){pune("tbKpiPiata","—","mutedInfo");pune("tbKpiPiataSub",z?z.text:"aștept lumânările","");return}
  pune("tbKpiPiata",z.ton==="rau"?"Împotrivă":z.ton==="bine"?"Cu botul":"Amestecat",tbTon(z.ton));
  var mari=d.rez.filter(function(r){return r.dir&&(r.tf==="4H"||r.tf==="1D")});
  var nume={urca:"urcă",coboara:"coboară",lateral:"laterală"};
  var b4=d.rez.filter(function(r){return r.tf==="4H"})[0];
  pune("tbKpiPiataSub",mari.map(function(r){return r.eticheta+" "+nume[r.dir]}).join(", ")+
    (b4&&b4.formare&&isFinite(b4.formare.pct)?"; bara de 4 ore acum "+tbFormateazaSemn(b4.formare.pct,1)+"%":""),"");
}
// v75: Tabloul unic - directia pietei fata de bot, graficul pe 24h, dovada.
// Toate cifrele de aici trec prin modulele pure (Directie, TabloBot), probate
// fara browser; aici doar se aduc datele si se deseneaza. Lipsa ramane "—".
var TB_DIR_TF=[
  {tf:"15M",eticheta:"15 min",orizont:16,limit:500,orizontText:"4 ore"},
  {tf:"60M",eticheta:"1 oră",orizont:24,limit:500,orizontText:"o zi"},
  {tf:"4H",eticheta:"4 ore",orizont:6,limit:500,orizontText:"o zi"},
  {tf:"1D",eticheta:"1 zi",orizont:7,limit:400,orizontText:"o săptămână"}];
var TB_DIR_REINCERCARE_MS=30000;
var TB_DIR_MS=5*60000,TB_GRAFIC_MS=2*60000;
var TB_PERIOADE={"24h":{i:"5M",l:288,gaura:12*60000},"3z":{i:"15M",l:288,gaura:40*60000},"7z":{i:"60M",l:168,gaura:150*60000}};
function tbAlegeInterval(p){if(!TB_PERIOADE[p])return;tbStare.graficInterval=p;["24h","3z","7z"].forEach(function(k){var e=$("tbInt"+k);if(e)e.setAttribute("aria-pressed",String(k===p))});if(tbStare.grafic)tbStare.grafic.la=0;tbAduGraficul()}
async function tbAduDirectie(){
  var b=tbStare.bot;if(!b||typeof Directie==="undefined")return;
  var s=TabloBot.simboluri(b.baza,b.quote).pionex;
  var d=tbStare.directie||(tbStare.directie={la:0,simbol:null,rez:null,inLucru:false});
  var cheie=s+"|"+(b.directie||"");
  if(d.inLucru||(d.simbol===cheie&&Date.now()-d.la<(d.eroare?TB_DIR_REINCERCARE_MS:TB_DIR_MS)))return;
  d.inLucru=true;
  try{
    var rez=[];
    // Pe rand, nu deodata: Pionex numara cererile, iar serverul le distanteaza oricum.
    for(var i=0;i<TB_DIR_TF.length;i++){
      var x=TB_DIR_TF[i];
      try{
        var k=await getJSON("/api/market?type=pionex_klines&symbol="+encodeURIComponent(s)+"&interval="+x.tf+"&limit="+x.limit);
        var randuri=k&&k.data&&Array.isArray(k.data.klines)?k.data.klines:null;
        if(!randuri)throw new Error((k&&k.error)||"Pionex nu a dat lumânări");
        rez.push(Object.assign({tf:x.tf,eticheta:x.eticheta,orizontText:x.orizontText},Directie.analizeaza(randuri,x.orizont,b.directie)));
        if(x.tf==="4H")d.randuri4h=randuri;
      }catch(e){rez.push({tf:x.tf,eticheta:x.eticheta,orizontText:x.orizontText,dir:null,stare:"eroare",motiv:textEroare(e)})}
    }
    d.rez=rez;d.simbol=cheie;d.la=Date.now();d.eroare=rez.every(function(r){return r.stare==="eroare"});
  }finally{d.inLucru=false}
  renderTabloDirectia();
}
async function tbAduGraficul(){
  var b=tbStare.bot;if(!b)return;
  var s=TabloBot.simboluri(b.baza,b.quote).pionex;
  var g=tbStare.grafic||(tbStare.grafic={la:0,simbol:null,randuri:null,inLucru:false});
  var cheieG=s+"|"+(tbStare.graficInterval||"24h");
  if(g.inLucru||(g.simbol===cheieG&&Date.now()-g.la<(g.eroare?TB_DIR_REINCERCARE_MS:TB_GRAFIC_MS)))return;
  g.inLucru=true;
  try{
    var per=TB_PERIOADE[tbStare.graficInterval||"24h"];
    var k=await getJSON("/api/market?type=pionex_klines&symbol="+encodeURIComponent(s)+"&interval="+per.i+"&limit="+per.l);
    g.randuri=k&&k.data&&Array.isArray(k.data.klines)?k.data.klines:null;g.eroare=g.randuri?null:"Pionex nu a dat prețuri";
    g.simbol=cheieG;g.la=Date.now();
  }catch(e){g.eroare=textEroare(e)}finally{g.inLucru=false}
  renderTabloGrafic();
}
function tbTon(ton){return ton==="rau"?"bad":ton==="bine"?"good":ton==="atentie"?"tbWarn":"mutedInfo"}
function renderTabloDirectia(){
  var el=$("tbDirectie"),rz=$("tbDirectieRezumat");if(!el||!rz)return;
  var b=tbStare.routeOk===false?null:tbStare.bot,d=tbStare.directie;
  if($("tbDirectieBot"))$("tbDirectieBot").textContent=b?("botul e "+(b.directie||"?")+(b.levier!=null?" "+b.levier+"×":"")):"—";
  if(!b){rz.className="tbRezumat mutedInfo";rz.textContent="Fără bot, n-am față de ce să judec direcția.";el.innerHTML="";tbDeseneazaKpi();return}
  if(!d||!d.rez){rz.className="tbRezumat mutedInfo";rz.textContent="Aștept lumânările…";el.innerHTML="";tbDeseneazaKpi();return}
  var z=Directie.rezumat(d.rez,b.directie);
  rz.className="tbRezumat "+tbTon(z.ton);rz.textContent=z.text;
  var sageata={urca:"↑",coboara:"↓",lateral:"↔"},cuvant={urca:"urcă",coboara:"coboară",lateral:"laterală"};
  // Compact: un rand pe interval (interval, directia, fata de bot) si dedesubt
  // doar cifrele care conteaza; detaliul statistic sta in titlul randului.
  el.innerHTML=d.rez.map(function(r){
    if(!r.dir)return '<div class="tbDirR"><div class="tbDirSus"><span class="tbDirTf">'+escapeHtml(r.eticheta)+'</span><span class="mutedInfo">—</span></div><div class="tbSub">'+escapeHtml(r.motiv||"n-am destule bare")+'</div></div>';
    var s=r.schimbare||{},jos=[];
    if(r.formare&&isFinite(r.formare.pct))jos.push('bara de acum <b class="'+(r.formare.pct>0?"good":r.formare.pct<0?"bad":"")+'">'+tbFormateazaSemn(r.formare.pct,1)+'%</b>');
    if(s.valoare!=null)jos.push('s-a schimbat în '+Math.round(s.valoare)+'% din '+s.cazuri+' cazuri, după '+escapeHtml(r.orizontText));
    else jos.push('prea puține cazuri în istoric');
    var titlu=s.valoare!=null?("Interval de încredere "+Math.round(s.ic.jos)+"-"+Math.round(s.ic.sus)+"%"+(s.spreOpus!=null?", spre direcția opusă "+Math.round(s.spreOpus)+"%":"")+(s.stare==="dovedit"?", dovedit":", puține cazuri")+". Stare ținută de "+r.vechime+" bare închise."):"";
    return '<div class="tbDirR" title="'+escapeHtml(titlu)+'"><div class="tbDirSus"><span class="tbDirTf">'+escapeHtml(r.eticheta)+'</span>'+
      '<b class="'+(r.dir==="urca"?"good":r.dir==="coboara"?"bad":"neutral")+'">'+sageata[r.dir]+' '+cuvant[r.dir]+'</b>'+
      '<span class="tbDirFata '+tbTon(r.fata.ton)+'">'+escapeHtml(r.fata.eticheta)+'</span></div>'+
      '<div class="tbSub">'+jos.join('; ')+'</div></div>';
  }).join("");
  tbDeseneazaKpi();tbActualizeazaBanda();
}
function tbPretScurt(v){if(v==null||!isFinite(v))return "—";var a=Math.abs(v);return v.toFixed(a>=100?2:a>=1?4:a>=0.01?5:8)}
function renderTabloGrafic(){
  var el=$("tbGrafic");if(!el)return;
  var b=tbStare.routeOk===false?null:tbStare.bot,g=tbStare.grafic,brut=tbStare.botBrut;
  if(!b){el.innerHTML='<div class="emptyState">—</div>';return}
  if(!g||!g.randuri){el.innerHTML='<div class="emptyState">'+escapeHtml(g&&g.eroare?"Nu am prețurile: "+g.eroare:"Aștept prețurile…")+'</div>';return}
  var ist=g.randuri.map(function(r){return {t:Number(Array.isArray(r)?r[0]:r.time),pretPerp:Array.isArray(r)?r[4]:r.close}});
  var per=TB_PERIOADE[tbStare.graficInterval||"24h"];
  var geo=TabloBot.geometrieGrafic(ist,brut,Date.now(),per.gaura);
  if(!geo.destul){el.innerHTML='<div class="emptyState">Prea puține prețuri pentru grafic.</div>';return}
  var W=1000,H=240,Y=function(f){return (H*(1-f)).toFixed(1)},X=function(f){return (W*f).toFixed(1)};
  var pret=function(p){return (p-geo.minPret)/(geo.maxPret-geo.minPret)};
  var etich=[],svg='<svg class="tbGraficSvg" viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" role="img" aria-label="Prețul '+escapeHtml(b.simbol||"")+' în ultimele 24 de ore">';
  if(geo.banda){
    svg+='<rect x="0" y="'+Y(geo.banda.sus)+'" width="'+W+'" height="'+(H*(geo.banda.sus-geo.banda.jos)).toFixed(1)+'" class="tbBanda"/>';
    etich.push({f:geo.banda.sus,t:"grid sus "+tbPretScurt(b.gridSus),c:"tbEtBanda"},{f:geo.banda.jos,t:"grid jos "+tbPretScurt(b.gridJos),c:"tbEtBanda"});
  }
  var intrare=b.pretDeschidere!=null?Number(b.pretDeschidere):null;
  if(intrare!=null&&intrare>geo.minPret&&intrare<geo.maxPret){
    svg+='<line x1="0" x2="'+W+'" y1="'+Y(pret(intrare))+'" y2="'+Y(pret(intrare))+'" class="tbLinieIntrare"/>';
    etich.push({f:pret(intrare),t:"intrarea medie "+tbPretScurt(intrare),c:"tbEtIntrare"});
  }
  var lich=b.pretLichidare!=null?Number(b.pretLichidare):null;
  if(lich!=null&&lich>geo.minPret&&lich<geo.maxPret){
    svg+='<line x1="0" x2="'+W+'" y1="'+Y(pret(lich))+'" y2="'+Y(pret(lich))+'" class="tbLinieLich"/>';
    etich.push({f:pret(lich),t:"lichidare "+tbPretScurt(lich),c:"tbEtLich"});
  }
  // Nivelurile gridului, subtiri: se vede pe ce trepte cumpara si vinde botul.
  var xo=(brut&&brut.buOrderData)||{},gj=botiNr(xo.bottom),gs=botiNr(xo.top),gr=botiNr(xo.row);
  if(gj!==null&&gs!==null&&gr>=1){var pas=(gs-gj)/gr,sare=Math.max(1,Math.ceil(gr/30));
    for(var ni=0;ni<=gr;ni+=sare){var L=gj+ni*pas;if(L>geo.minPret&&L<geo.maxPret)svg+='<line x1="0" x2="'+W+'" y1="'+Y(pret(L))+'" y2="'+Y(pret(L))+'" class="tbNivelGrid"/>'}}
  geo.segmente.forEach(function(seg){svg+='<polyline class="tbLiniePret" points="'+seg.map(function(p){return X(p.x)+","+Y(p.y)}).join(" ")+'"/>'});
  // v81: evenimentele - iesiri/reveniri din grid si alertele colectorului
  var ev=TabloExtra.evenimente(ist,tbStare.alerteServer||[],botiNr(b.gridJos),botiNr(b.gridSus),geo.deLa,geo.panaLa);
  ev.forEach(function(e){var fx=(e.t-geo.deLa)/((geo.panaLa-geo.deLa)||1);svg+='<line class="tbEv tbEv-'+e.fel+'" x1="'+X(fx)+'" x2="'+X(fx)+'" y1="0" y2="'+H+'"><title>'+escapeHtml(e.text)+'</title></line>'});
  svg+='<line class="tbCruce" x1="0" x2="0" y1="0" y2="'+H+'" style="display:none"/></svg>';
  var ultim=ist.filter(function(h){return Number(h.pretPerp)>0}).sort(function(a,c){return a.t-c.t});
  var pAcum=ultim.length?Number(ultim[ultim.length-1].pretPerp):null;
  if($("tbGraficPret"))$("tbGraficPret").textContent=pAcum!=null?"acum "+tbPretScurt(pAcum):"—";
  // Etichetele stau in HTML (nu in SVG), ca sa nu se deformeze cu latimea; cele prea apropiate se rarefiaza.
  etich.sort(function(a,c){return c.f-a.f});var ult=-1;
  var etHtml=etich.filter(function(e){var sus=(1-e.f)*100;if(ult>=0&&sus-ult<9)return false;ult=sus;return true})
    .map(function(e){return '<span class="tbEt '+e.c+'" style="top:calc('+((1-e.f)*100).toFixed(1)+'% - 9px)">'+escapeHtml(e.t)+'</span>'}).join("");
  var ora=function(t){var d=new Date(t),h=String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0");return (tbStare.graficInterval||"24h")==="24h"?h:(d.getDate()+"."+String(d.getMonth()+1).padStart(2,"0")+" "+h)};
  var evTxt=ev.length?'<div class="tbEvLeg">'+ev.slice(-6).map(function(e){return '<span class="tbEvL tbEv-'+e.fel+'">'+escapeHtml(ora(e.t)+" "+e.text)+'</span>'}).join("")+'</div>':"";
  el.innerHTML='<div class="tbGraficZona">'+svg+etHtml+'<div class="tbTip" hidden></div></div>'+evTxt+
    '<div class="tbAxa"><span>'+ora(geo.deLa)+'</span><span>'+ora(geo.deLa+(geo.panaLa-geo.deLa)/2)+'</span><span>'+ora(geo.panaLa)+'</span></div>';
  var zona=el.querySelector(".tbGraficZona"),cruce=el.querySelector(".tbCruce"),tip=el.querySelector(".tbTip");
  var puncte=ultim;
  var arata=function(ev){
    var r=zona.getBoundingClientRect();var fx=Math.min(1,Math.max(0,(ev.clientX-r.left)/r.width));
    var t=geo.deLa+fx*(geo.panaLa-geo.deLa),best=null;
    for(var i=0;i<puncte.length;i++)if(!best||Math.abs(puncte[i].t-t)<Math.abs(best.t-t))best=puncte[i];
    if(!best)return;
    var x=(best.t-geo.deLa)/(geo.panaLa-geo.deLa||1);
    cruce.setAttribute("x1",X(x));cruce.setAttribute("x2",X(x));cruce.style.display="";
    tip.hidden=false;tip.textContent=ora(best.t)+" · "+tbPretScurt(Number(best.pretPerp));
    tip.style.left=Math.min(r.width-140,Math.max(0,fx*r.width-60))+"px";
  };
  zona.addEventListener("pointermove",arata);zona.addEventListener("pointerdown",arata);
  zona.addEventListener("pointerleave",function(){cruce.style.display="none";tip.hidden=true});
}
function renderTabloDovada(){
  var el=$("tbDovada");if(!el)return;
  var b=tbStare.routeOk===false?null:tbStare.botBrut,ist=tbStare.routeOk===false?[]:(tbStare.istoric||[]);
  if(!b){el.innerHTML='<div class="emptyState">—</div>';if($("tbDovadaAcoperire"))$("tbDovadaAcoperire").textContent="—";return}
  var f=TabloBot.frecvente(ist,b,Date.now());
  var min=ist.length?Math.round((Date.now()-Number(ist[0].t))/60000):0;
  if($("tbDovadaAcoperire"))$("tbDovadaAcoperire").textContent=ist.length?("istoric: "+(min>=120?Math.round(min/60)+" ore":min+" min")):"fără istoric încă";
  var stare=function(x){return !x||x.valoare==null?"—":x.stare==="dovedit"?"dovedit":"puțin"};
  var rand=function(nume,x,txt){return '<div class="accountRow"><div class="accountCell">'+escapeHtml(nume)+'</div><div class="accountCell '+(x&&x.valoare!=null?"":"mutedInfo")+'">'+(x&&x.valoare!=null?txt(x):"—")+'</div><div class="accountCell">'+stare(x)+(x&&x.acoperire!=null?' · observat '+x.acoperire+'% din timp':'')+'</div></div>'};
  el.innerHTML=
    rand("Perechi închise pe oră",f.perechiPeOra,function(x){return x.valoare.toFixed(1)})+
    rand("Profit net pe zi (observat)",f.netPeZi,function(x){return botiBan(x.valoare,2)})+
    rand("Timp cu prețul în interval",f.timpInInterval,function(x){return Math.round(x.valoare)+"%"})+
    rand("Timp lângă o margine a gridului",f.desLaMargine,function(x){return Math.round(x.valoare)+"%"});
}
function tbDeseneazaTabloulUnic(){renderTabloDirectia();tbDeseneazaKpi();renderTabloSfaturi();renderTabloScenarii();renderTabloAlerte();tbAduExtra();renderTabloGrafic();renderTabloDovada();tbAduDirectie();if(tbPanouVizibil())tbAduGraficul();tbActualizeazaBanda();tbPiataPeBot()}
// Banda de sus, pe ORICE ecran: botul, banii totali, lichidarea, directia. Omul
// vede starea botului fara sa deschida Tabloul; apasand, ajunge in el.
function tbActualizeazaBanda(){
  var el=$("botStrip");if(!el)return;
  var b=tbStare.routeOk===false?null:tbStare.bot;
  if(!b){el.hidden=true;return}
  var parti=[(b.baza||"").replace(/\.PERP$/,"")+" "+(b.directie||"")+(b.levier!=null?" "+b.levier+"\u00d7":"")];
  var tot=botiNr(b.profitTotal);
  parti.push(tot===null?"total \u2014":"total "+(tot>0?"+":"")+tot.toFixed(2)+" USDT");
  var dist=botiNr(b.distantaLichidarePct);
  parti.push(b.lichidareDepasita?"LICHIDARE DEPĂȘITĂ":dist===null?"lichidare \u2014":"lichidare "+Math.abs(dist).toFixed(1)+"%");
  var d=tbStare.directie,z=d&&d.rez&&typeof Directie!=="undefined"?Directie.rezumat(d.rez,b.directie):null;
  if(z&&z.ton!=="nu-se-poate")parti.push(z.ton==="rau"?"piața: împotrivă":z.ton==="bine"?"piața: cu botul":"piața: amestecat");
  el.textContent=parti.join(" \u00b7 ");
  el.hidden=false;
  var rau=(dist!==null&&(b.lichidareDepasita||Math.abs(dist)<15))||(z&&z.ton==="rau");
  el.className="statusChip botStrip "+(rau?"bad":(tot===null||dist===null||tot<0)?"tbWarn":"good");
}
// Indicatorii generali (Dashboard, Engine, Multi-TF...) pornesc pe moneda
// botului, nu pe BTC - o singura data, si doar daca omul n-a ales el alta.
var tbPiataSetata=false;
function tbPiataPeBot(){
  if(tbPiataSetata)return;var b=tbStare.bot,inp=$("symbol");if(!b||!inp)return;
  tbPiataSetata=true;
  var ales=null;try{ales=localStorage.getItem("crPiataAleasaDeOm")}catch{}
  if(ales||String(inp.value||"").toUpperCase()!=="BTC")return;
  var baza=String(b.baza||"").replace(/\.PERP$/,"").toUpperCase();
  if(!/^[A-Z0-9]{2,15}$/.test(baza))return;
  inp.value=baza;
  if($("heroCoin"))$("heroCoin").textContent=baza+" / USDT";
  if($("topCoin"))$("topCoin").textContent=baza+"/USDT";
}
function renderTabloBot(){
  var eroareActiva=tbStare.routeOk===false;
  var b=eroareActiva?null:tbStare.bot;
  var brut=eroareActiva?null:tbStare.botBrut;
  var ist=eroareActiva?[]:(tbStare.istoric||[]);
  var klinePentruMasura=eroareActiva?[]:tbStare.klinePerp;
  var pretSpotPentruMasura=(!eroareActiva&&tbPretSpotProaspat())?tbStare.pretSpot:null;
  var alegeri=tbCiteste(TB_MOD)||{};
  // faraBot e adevarat DOAR cand ruta a raspuns bine SI lista de boti e goala.
  // Daca ruta a picat (eroare), nu inseamna "fara bot" - trebuie aratat ca eroare.
  var faraBot=tbStare.routeOk===true&&!b;
  var m=TabloBot.masoara({bot:brut,klinePerp:klinePentruMasura,
    pretSpot:pretSpotPentruMasura,istoric:ist,acum:Date.now(),
    pretPerpViu:(!eroareActiva&&b)?b.pretCurent:null});
  var mod=TabloBot.modBot(brut,alegeri);
  var v;
  if(eroareActiva){
    // "AUTH_REQUIRED" e corect tehnic si inutil pentru om: nu-i spune nici unde
    // e, nici ce are de facut. explicaEroarea traduce in ce trebuie sa faca.
    var ex=explicaEroareaAplicatiei(tbStare.eroare,tbStare.eroareStatus);
    v={nivel:"EROARE",titlu:ex.titlu,ceFac:ex.ceFac,declansator:null};
  }else if(b&&tbStare.stocareStricata){
    v={nivel:"EROARE",titlu:"Stocarea locală nu funcționează",
      ceFac:"Acest browser blochează localStorage, deci nu pot ține istoricul botului - ritmul și verdictele care depind de el rămân nedovedite pe veci, nu doar 30 de minute.",
      declansator:null};
  }else{
    v=TabloBot.verdict(m,mod.mod,{faraBot:faraBot});
  }
  var note=[];
  tbDeseneazaSelectorul();
  if(!eroareActiva&&tbStare.probleme&&tbStare.probleme.preturi)
    note.push("Pionex: tickere PERP indisponibile ("+tbStare.probleme.preturi+")");
  if(!eroareActiva&&b&&tbStare.klineStare==="invechit")
    note.push("lumânările sunt învechite - ultima citire a picat");
  if($("tbSimbol")){
    if(eroareActiva)$("tbSimbol").textContent="—";
    else if(!b)$("tbSimbol").textContent="fără bot";
    else{
      var total=tbStare.boti.length;
      // "activ" DOAR cand chiar e activ - altfel botul ales (singurul disponibil,
      // caci n-a fost niciunul pornit) e OPRIT, si omul trebuie sa afle asta,
      // nu sa citeasca o eticheta care minte exact ca cea reparata la I4/I5.
      var eticheta=b.activ?(total>1?"activ, din "+total+" boți":""):("oprit"+(total>1?", din "+total+" boți":""));
      $("tbSimbol").textContent=b.simbol+(eticheta?" · "+eticheta:"");
      // Daca botul ales de om a disparut, ecranul NU are voie sa arate tacut
      // altul: omul ar crede ca se uita la al lui.
      if(tbStare.motivAlegere==="preferat-disparut")
        note.push("botul ales de tine nu mai e în listă - se arată "+b.simbol);
    }
  }
  if($("tbMod")){
    if(eroareActiva||!b)$("tbMod").textContent="—";
    else{
      var directieNecunoscuta=mod.mod==="DIRECTIONAL"&&m.directieBot===0;
      $("tbMod").textContent=mod.mod+(mod.presupus?" (presupus)":"")+
        (directieNecunoscuta?" · direcție necunoscută":"");
    }
  }
  if($("tbSchimbaModulBtn"))
    $("tbSchimbaModulBtn").disabled=!!(eroareActiva||!b||!brut||brut.strategyId==null);
  if($("tbNivel")){$("tbNivel").textContent=v.nivel;$("tbNivel").className=tbNivelClasa(v.nivel)}
  if($("tbTitlu"))$("tbTitlu").textContent=v.titlu;
  if($("tbCeFac"))$("tbCeFac").textContent=v.ceFac+(note.length?" · "+note.join(" · "):"");
  if($("tbDeCe")){
    var dUnit=v.declansator&&m[v.declansator.masura]?m[v.declansator.masura].unitate:null;
    $("tbDeCe").textContent=v.declansator
      ? v.declansator.masura+" = "+tbCuUnitate(v.declansator.valoare==null?"—":String(v.declansator.valoare),dUnit)+" (prag "+tbCuUnitate(v.declansator.prag==null?"—":String(v.declansator.prag),dUnit)+")" : "";
  }
  // La parola lipsa/gresita omul primeste si drumul, nu doar textul.
  if($("tbSpreSetari"))$("tbSpreSetari").hidden=!(eroareActiva&&eroareDeParola(tbStare.eroare,tbStare.eroareStatus));
  tbDeseneazaBanii(b);
  if($("tbPret")){
    if(tbStare.pretSpot==null)$("tbPret").textContent="—";
    else $("tbPret").textContent="spot "+tbStare.pretSpot+(tbPretSpotProaspat()?"":" (învechit)");
  }
  // Rigla: unde esti intre jos si sus, cu semnul tau pe ea si lichidarea marcata.
  if($("tbRigla")){
    var p=m.pozitieInterval.valoare;
    if(p==null){
      var motiv=!b?"Fără bot, n-am interval de arătat.":"Nu am încă lumânări pentru interval.";
      $("tbRigla").innerHTML='<div class="emptyState">'+escapeHtml(motiv)+'</div>';
    }else{
      var loc=Math.max(0,Math.min(100,p)),trepte=20,poz=Math.round(loc/100*trepte);
      var bara="";for(var i=0;i<=trepte;i++)bara+=i===poz?"●":"─";
      var lichR=tbLichidareDinMasura(m.lichidare);
      var clsLich=lichR.cls==="bad"||m.lichidare.stare==="rau"?"bad":m.lichidare.stare==="margine"?"tbWarn":"mutedInfo";
      $("tbRigla").innerHTML='<div class="accountRow"><div class="accountCell">'+
        (b.gridJos!=null?b.gridJos:"—")+'</div><div class="accountCell"><b>'+bara+'</b><br>'+
        Math.round(p)+'% din interval</div><div class="accountCell">'+
        (b.gridSus!=null?b.gridSus:"—")+'</div><div class="accountCell '+clsLich+'">'+
        escapeHtml(m.lichidare.valoare!=null?lichR.text:"—")+
        '<br><span class="fine">față de ultimul preț</span></div></div>';
    }
  }
  var randuri=[["poziția în interval",m.pozitieInterval],["ritmul perechilor",m.ritmPerechi],
    ["oscilație sau trend",m.eficienta],["amplitudine vs treaptă",m.amplitudine],
    ["până la lichidare",m.lichidare],["basis perp vs spot",m.basis],["comision vs grid",m.comision]];
  if($("tbMasuri"))$("tbMasuri").innerHTML=randuri.map(function(r){
    var val=r[1]&&r[1].valoare!=null?(r[1]===m.lichidare?tbLichidareScurt(r[1]):tbCuUnitate(tbFormateazaSemn(+r[1].valoare,2),r[1].unitate)):"—";
    var cls=r[1]&&(r[1].stare==="rau"||r[1].stare==="afara"||(r[1]===m.lichidare&&(r[1].depasita||+r[1].valoare<0)))?"bad":
      r[1]&&r[1].stare==="margine"?"tbWarn":r[1]&&r[1].stare==="bine"?"good":"mutedInfo";
    return '<div class="accountRow"><div class="accountCell">'+escapeHtml(r[0])+
      '</div><div class="accountCell '+cls+'">'+val+'</div><div class="accountCell">'+
      escapeHtml(String((r[1]&&r[1].stare)||"—")+(r[1]&&typeof r[1].eticheta==="string"&&r[1].eticheta?" · "+r[1].eticheta:""))+"</div></div>";
  }).join("");
  tbDeseneazaTabloulUnic();
}
function porneTabloBot(){
  tbAduDate();
  tbColectorRecadenteaza();
}
async function v71SyncPionexJournal(showToast=false){if(assetClass()!=="CRYPTO")return null;const symbol=v71CurrentSymbol();if(!symbol)return null;if($("v71ReconState"))$("v71ReconState").textContent="SYNCING";try{const fillHistory=await v71FetchHistory("fills",symbol),orderHistory=await v71FetchHistory("orders",symbol),radar=await v71RadarOrderIds(),prior=v71StoredJournal(symbol),fresh=fillHistory.rows.map(x=>v71NormalizeFill(x,symbol)).filter(x=>x.symbol===symbol),fills=v71Dedupe([...(prior.fills||[]).filter(x=>x.symbol===symbol),...fresh]),built=v71BuildTrades(fills,radar),orders=orderHistory.rows.filter(x=>v71SafeSymbol(x.symbol||symbol)===symbol),orderIds=new Set(orders.map(x=>v71Id(x,"order"))),fillOrderIds=new Set(fills.map(x=>String(x.orderId))),historyComplete=!fillHistory.truncated&&!orderHistory.truncated,missingOrders=historyComplete?[...fillOrderIds].filter(x=>x&&x!=="?"&&!orderIds.has(x)):[];const journal={schema:71,symbol,fills,trades:built.trades,openLots:built.openLots,unmatched:built.unmatched,missingOrders,ordersSeen:orderIds.size,updated:Date.now(),readOnly:true,complete:historyComplete,history:{start:fillHistory.start,end:fillHistory.end,fillRequests:fillHistory.requests,orderRequests:orderHistory.requests,truncated:!historyComplete}};v60StoreSet(V71_JOURNAL_PREFIX+symbol,journal);v60StoreSet(V71_CURRENT_SYMBOL_KEY,symbol);v60StoreSet(V71_SYNC_KEY,{symbol,ts:journal.updated,fillCount:fills.length,tradeCount:built.trades.length,complete:historyComplete});if(localDbSupported()&&!appSettings().privacySessionOnly)await localDbPutRecord("pionex_journal_v71",symbol,journal,journal.updated).catch(()=>{});const s=v71RenderJournal();renderAnalytics();renderProfitReadiness(false);if(showToast)toast(`Pionex journal ${symbol} · ${s.fills} fills · ${s.trades} trades · ${historyComplete?"complete":"review truncation"}`,historyComplete&&!s.unmatched&&!s.feeReview?"good":"warn");return journal}catch(e){if($("v71ReconState"))$("v71ReconState").textContent="SYNC ERROR";if($("v71SyncNote"))$("v71SyncNote").textContent=`Sync failed: ${e.message}`;if(showToast)toast(`Pionex journal: ${e.message}`,"bad");return null}}
function v71ExportJournal(){const j=v71StoredJournal(),checksumInput=JSON.stringify(j);downloadTextFile(`crypto-radar-v71-pionex-journal-${j.symbol||"none"}-${new Date().toISOString().slice(0,10)}.json`,JSON.stringify({schemaVersion:71,exportedAt:Date.now(),readOnly:true,journal:j},null,2),"application/json");sha256Text(checksumInput).then(x=>toast(`Journal exported · SHA-256 ${x.slice(0,12)}…`,"good"))}
function initV71PionexJournal(){v71RenderJournal()}


document.addEventListener("change",function(e){if(e.target&&e.target.id==="symbol"){try{localStorage.setItem("crPiataAleasaDeOm",String(e.target.value||""))}catch{}}});
document.addEventListener("keydown",e=>{if(e.key!=="Tab")return;const p=["commandPalette","moreDrawer"].map($).find(x=>x?.classList.contains("on"));if(!p)return;const f=[...p.querySelectorAll("button,input,select,textarea,[tabindex]:not([tabindex=\"-1\"])")].filter(x=>!x.disabled&&x.offsetParent!==null);if(!f.length){e.preventDefault();p.focus();return}const first=f[0],last=f.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}});
document.addEventListener("keydown",e=>{
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();toggleCommandPalette();return}
 if(e.key==="Escape"){$("commandPalette")?.classList.remove("on");closeMoreDrawer();return}
 if(e.target&&["INPUT","TEXTAREA","SELECT"].includes(e.target.tagName))return;
 if(e.key==="/"){e.preventDefault();$("symbol").focus()}
 else if(e.key.toLowerCase()==="a")analyze(true);
 else if(e.key.toLowerCase()==="s")navTo("scan",true);
});
if("serviceWorker" in navigator){navigator.serviceWorker.register("/sw.js").then(pwaHandleRegistration).catch(()=>{})}
setTimeout(()=>{if(!isStandalonePwa())showPwaInstall();renderPwaHealth();pwaInitDeepLink()},900)


// v54 CSP-safe delegated event actions. No eval/new Function is used.
function v54SplitTopLevel(text,sep){let out=[],cur="",q=null,esc=false,depth=0;for(const ch of String(text||"")){if(esc){cur+=ch;esc=false;continue}if(ch==="\\"){cur+=ch;esc=true;continue}if(q){cur+=ch;if(ch===q)q=null;continue}if(ch==="'"||ch==='"'){q=ch;cur+=ch;continue}if(ch==="("||ch==="["){depth++;cur+=ch;continue}if(ch===")"||ch==="]"){depth=Math.max(0,depth-1);cur+=ch;continue}if(ch===sep&&depth===0){if(cur.trim())out.push(cur.trim());cur=""}else cur+=ch}if(cur.trim())out.push(cur.trim());return out}
function v54ActionArg(token,el,event){const t=String(token||"").trim();if(!t)return undefined;if(t==="true")return true;if(t==="false")return false;if(t==="null")return null;if(t==="this.value")return el?.value;if(t==="this.checked")return !!el?.checked;if(t==="this.files[0]")return el?.files?.[0]||null;if(t==="event.target.value")return event?.target?.value;if(/^[-+]?\d+(?:\.\d+)?$/.test(t))return Number(t);if((t.startsWith("'")&&t.endsWith("'"))||(t.startsWith('"')&&t.endsWith('"')))return t.slice(1,-1).replace(/\\(['"\\])/g,"$1");throw Error("Unsupported delegated action argument")}
function v54RunActionExpression(expr,el,event){for(let stmt of v54SplitTopLevel(expr,";")){const cond="if(event.target===this)";if(stmt.startsWith(cond)){if(event.target!==el)continue;stmt=stmt.slice(cond.length).trim()}const click=stmt.match(/^document\.getElementById\(['"]([^'"]+)['"]\)\.click\(\)$/);if(click){document.getElementById(click[1])?.click();continue}const m=stmt.match(/^([A-Za-z_$][\w$]*)\((.*)\)$/);if(!m)continue;const fn=globalThis[m[1]];if(typeof fn!=="function")continue;const args=m[2].trim()?v54SplitTopLevel(m[2],",").map(x=>v54ActionArg(x,el,event)):[];fn(...args)}}
for(const [evt,attr] of [["click","data-action-click"],["change","data-action-change"],["input","data-action-input"]])document.addEventListener(evt,e=>{const el=e.target?.closest?.(`[${attr}]`);if(!el)return;try{v54RunActionExpression(el.getAttribute(attr),el,e)}catch(err){console.error("Delegated UI action failed",err)}});


// v65 · Decision Intelligence OS Pro
const V65_VERSION="v65";
function v65Clamp(x,a=0,b=100){return Math.max(a,Math.min(b,Number.isFinite(+x)?+x:0))}
function v65BiasScore(x){return Number.isFinite(+x)?v65Clamp((+x+1)*50):50}
function v65Module(key,label,state,score,bias,detail,action="",severity="INFO",meta={}){return {key,label,state:String(state||"N/A"),score:v65Clamp(score),bias:Number.isFinite(+bias)?Math.max(-1,Math.min(1,+bias)):0,detail:String(detail||""),action:String(action||""),severity,...meta}}
function v65RegimeClass(q={}){const rv=+q.rvPercentile||50,ch=+q.chop||50,adx=+q.adx||0,score=+q.score||50,bo=String(q.breakout||"NONE"),sq=String(q.ttm?.state||"");if(rv>=90)return score>=55?"PANIC / HIGH-VOL UP":"PANIC / HIGH-VOL DOWN";if(sq.includes("SQUEEZE ON"))return "SQUEEZE";if(bo!=="NONE"&&(+q.vr||0)>=1.15)return bo==="UP"?"BREAKOUT UP":"BREAKOUT DOWN";if(ch>=61)return "RANGE";if(adx>=25)return score>=55?"TREND UP":"TREND DOWN";if(rv<=25)return "LOW VOL";return "TRANSITION"}
function v65RegimeIntelligence(st=window.__radarState){if(!st?.q)return v65Module("regime","Regime Intelligence Pro","NO DATA",0,0,"Run analysis first.");const rows=(st.m||[]).map(x=>({tf:x.tf,state:v65RegimeClass(x),score:+x.score||50}));if(!rows.some(x=>x.tf===st.tf))rows.unshift({tf:st.tf,state:v65RegimeClass(st.q),score:+st.q.score||50});const up=rows.filter(x=>x.state.includes("UP")).length,down=rows.filter(x=>x.state.includes("DOWN")).length,range=rows.filter(x=>x.state==="RANGE"||x.state==="SQUEEZE").length,n=Math.max(1,rows.length),bias=(up-down)/n,agreement=Math.max(up,down,range)/n,state=v65RegimeClass(st.q),score=v65Clamp(45+agreement*35+Math.abs(bias)*20);return v65Module("regime","Regime Intelligence Pro",state,score,bias,rows.map(x=>`${x.tf}:${x.state}`).join(" · "),`Strategy weights adapt to ${state}.`,state.includes("PANIC")?"WARN":"INFO",{rows,agreement})}
function v65LiquidityStructure(st=window.__radarState){if(!st?.q)return v65Module("structure","Liquidity & Market Structure","NO DATA",0,0,"Run analysis first.");const q=st.q,s=window.__structureV38||{},smc=q.smc||{},liq=q.liquidity||{},base=(+q.structureScore||50-50)/50;let bias=((+q.structureScore||50)-50)/50,reasons=[];if(String(smc.bos).includes("UP")){bias+=.25;reasons.push("BOS UP")}if(String(smc.bos).includes("DOWN")){bias-=.25;reasons.push("BOS DOWN")}if(String(smc.sweep).includes("LOW")){bias+=.18;reasons.push("sell-side sweep")}if(String(smc.sweep).includes("HIGH")){bias-=.18;reasons.push("buy-side sweep")}if(String(smc.fvg).includes("BULL")){bias+=.10;reasons.push("bull FVG")}if(String(smc.fvg).includes("BEAR")){bias-=.10;reasons.push("bear FVG")}bias=Math.max(-1,Math.min(1,bias));const pools=[liq.equalHigh?`EQH ${num(liq.equalHigh)}`:null,liq.equalLow?`EQL ${num(liq.equalLow)}`:null,liq.fvg?`${liq.fvg.type} FVG ${liq.fvg.status}`:null].filter(Boolean);const state=bias>.22?"BULL STRUCTURE":bias<-.22?"BEAR STRUCTURE":"BALANCED",score=v65Clamp(55+Math.abs(bias)*35+(reasons.length?10:0));return v65Module("structure","Liquidity & Market Structure",state,score,bias,[...reasons,...pools].join(" · ")||"No dominant liquidity event.",`Liquidity map: ${liq.premium||"N/A"}.`,"INFO",{pools,reasons})}
function v65CrossAssetConfirmation(){const d=window.__intelContext||{},macro=Number(d?.macro?.riskOnScore),ctx=Number.isFinite(macro)?macro:contextScoreFrom(d.global,d.macro),breadth=Number(window.__marketBreadthV64?.score),parts=[ctx,breadth].filter(Number.isFinite),score=parts.length?parts.reduce((a,b)=>a+b,0)/parts.length:50,bias=(score-50)/50,state=score>=62?"RISK-ON CONFIRM":score<=38?"RISK-OFF CONFIRM":"MIXED";const detail=assetClass()==="STOCKS"?`${macroPairText(d.macro,"QQQ","SPY")} · ${macroPairText(d.macro,"TLT","GLD")}`:`Macro ${Number.isFinite(macro)?macro.toFixed(0)+"/100":"N/A"} · BTC dom ${Number.isFinite(+d.global?.btcDominance)?(+d.global.btcDominance).toFixed(1)+"%":"N/A"} · breadth ${Number.isFinite(breadth)?breadth.toFixed(0):"N/A"}`;return v65Module("crossAsset","Cross-Asset Confirmation",state,score,bias,detail,"Use as context confirmation, never as a standalone trigger.",parts.length?"INFO":"WARN")}
function v65ConflictResolver(st=window.__radarState,ss=window.__signalState){if(!st?.q||!ss)return v65Module("conflict","Signal Conflict Resolver","NO DATA",0,0,"Run analysis first.");const q=st.q,dir=ss.tm?.direction==="LONG"?1:ss.tm?.direction==="SHORT"?-1:0,ctx=window.__intelContext?contextScoreFrom(window.__intelContext.global,window.__intelContext.macro):NaN,vals=[(+q.trendScore-50)/50,(+q.momScore-50)/50,(+q.structureScore-50)/50,(+ss.mc?.avg-50)/50,Number.isFinite(+window.__marketBreadthV64?.score)?(+window.__marketBreadthV64.score-50)/50:NaN,Number.isFinite(+trueFlowState?.delta)?Math.max(-1,Math.min(1,+trueFlowState.delta/35)):NaN,Number.isFinite(+ctx)?(+ctx-50)/50:NaN].filter(Number.isFinite),net=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0,aligned=dir?vals.filter(x=>x*dir>.12).length:0,opposed=dir?vals.filter(x=>x*dir<-.12).length:0,agreement=dir&&vals.length?aligned/vals.length:1-Math.min(1,Math.abs(net)),state=opposed>=3||agreement<.45?"HIGH CONFLICT":opposed>=1||agreement<.68?"MIXED":"CLEAR",score=v65Clamp(agreement*100),detail=`Aligned ${aligned}/${vals.length} · opposed ${opposed} · net ${(net*100).toFixed(0)}`;return v65Module("conflict","Signal Conflict Resolver",state,score,net,detail,state==="HIGH CONFLICT"?"WAIT / require retest or stronger confirmation.":state==="MIXED"?"Prefer reduced aggression / retest.":"Signals are directionally coherent.",state==="HIGH CONFLICT"?"BLOCK":state==="MIXED"?"WARN":"INFO",{agreement,aligned,opposed,vals})}
function v65AdaptiveEntry(st=window.__radarState,ss=window.__signalState,conflict=null){if(!st?.q||!ss)return v65Module("entry","Adaptive Entry Engine","NO DATA",0,0,"Run analysis first.");const q=st.q,tm=ss.tm||{},dir=tm.direction,cf=conflict||v65ConflictResolver(st,ss);if(dir==="WAIT")return v65Module("entry","Adaptive Entry Engine","WAIT",25,0,"Base engine has no active direction.","NO ENTRY","BLOCK");const alignedBreak=(dir==="LONG"&&q.breakout==="UP")||(dir==="SHORT"&&q.breakout==="DOWN"),range=String(v65RegimeClass(q)).includes("RANGE")||String(v65RegimeClass(q)).includes("SQUEEZE"),strongTrend=(+q.adx||0)>=28&&(+q.vr||0)>=1.15,mid=(+tm.entryLow+ +tm.entryHigh)/2;let state="LIMIT RETEST",score=70,action=`LIMIT ${num(mid)}`;if(cf.state==="HIGH CONFLICT"){state="WAIT RETEST";score=35;action=`WAIT · zone ${num(tm.entryLow)}–${num(tm.entryHigh)}`}else if(alignedBreak&&strongTrend){state="BREAKOUT ENTRY";score=88;action=`BREAKOUT ${dir} · invalidate ${num(tm.stop)}`}else if(strongTrend&&!range&&cf.state==="CLEAR"){state="MARKET / AGGRESSIVE LIMIT";score=82;action=`${dir} near ${num(q.price)}`}else if(range){state="LIMIT AT STRUCTURE";score=72;action=`LIMIT ${num(mid)} · avoid chasing`};return v65Module("entry","Adaptive Entry Engine",state,score,dir==="LONG"?1:-1,`Zone ${num(tm.entryLow)}–${num(tm.entryHigh)} · stop ${num(tm.stop)} · ADX ${(+q.adx||0).toFixed(0)} · conflict ${cf.state}`,action,cf.state==="HIGH CONFLICT"?"WARN":"INFO",{entryLow:tm.entryLow,entryHigh:tm.entryHigh,stop:tm.stop,tp1:tm.tp1,tp2:tm.tp2,tp3:tm.tp3})}
function v65ActivePaper(){const sym=window.__radarState?.symbol;return paperTrades().map(paperMigrateTrade).filter(x=>paperPositionActive(x)&&(!sym||coin(x.symbol)===coin(sym))).sort((a,b)=>(+b.ts||+b.created||0)-(+a.ts||+a.created||0))[0]||null}
function v65DynamicExit(st=window.__radarState,ss=window.__signalState,conflict=null){const t=v65ActivePaper();if(!t)return v65Module("exit","Dynamic Exit Intelligence","NO POSITION",50,0,"No active Paper position for the current symbol.","HOLD / N/A");const q=st?.q||{},dir=t.direction==="LONG"?1:-1,last=+t.last||+q.price||+t.entry,stop=+t.managedStop||+t.stop,initialRisk=Math.abs((+t.entry||last)-(+t.initialStop||+t.stop||stop))||Math.max(1e-12,Math.abs(+t.entry||last)*.01),r=dir*(last-(+t.entry||last))/initialRisk,cf=conflict||v65ConflictResolver(st,ss),breadthAlign=v64BreadthAlignment(t.direction),opp=(cf.state==="HIGH CONFLICT")||(Number.isFinite(breadthAlign)&&breadthAlign<-.35),momentum=Number.isFinite(+q.momScore)?dir*((+q.momScore-50)/50):0;let state="HOLD",score=75,action="HOLD";if(opp&&r<.4){state="CLOSE / PROTECT";score=90;action="CLOSE"}else if(r>=2&&momentum<0){state="TAKE PROFIT";score=88;action="TAKE 25–50% · TRAIL"}else if(r>=1){state="PROTECT PROFIT";score=84;action=stop===(+t.entry)?"TRAIL":"MOVE BE / TRAIL"}else if(cf.state==="MIXED"){state="TIGHTEN";score=68;action="TIGHTEN / WATCH"};return v65Module("exit","Dynamic Exit Intelligence",state,score,dir,`Paper R ${r.toFixed(2)} · conflict ${cf.state} · breadth ${Number.isFinite(breadthAlign)?breadthAlign.toFixed(2):"N/A"}`,action,opp?"WARN":"INFO",{tradeId:t.id,r})}
function v65PortfolioAllocator(){const rows=(scannerRows||[]).filter(x=>Number.isFinite(+x.avg)||Number.isFinite(+x.score)).slice().sort((a,b)=>(+b.avg||+b.score||0)-(+a.avg||+a.score||0)).slice(0,8),budget=portfolioBudgetSummary(window.__portfolioRisk?.clusters||[]),blocked=budget.state==="BLOCK"||window.__portfolioStress?.state==="SEVERE";if(!rows.length)return v65Module("allocator","Portfolio Opportunity Allocator",blocked?"BLOCK":"NO SCAN",blocked?0:35,0,"Run Scanner to allocate opportunities.",blocked?"NO NEW EXPOSURE":"RUN SCANNER",blocked?"BLOCK":"WARN");const raw=rows.map(x=>Math.max(1,(+x.avg||+x.score||50)-45)),sum=raw.reduce((a,b)=>a+b,0)||1,alloc=rows.slice(0,5).map((x,i)=>({symbol:x.c||x.symbol,weight:Math.min(35,100*raw[i]/sum),score:+x.avg||+x.score||0,dir:x.dir||x.signal||"?"})),used=alloc.reduce((a,x)=>a+x.weight,0),state=blocked?"BLOCK":budget.state==="WATCH"?"REDUCED":"ALLOCATE",score=blocked?10:budget.state==="WATCH"?62:82,detail=alloc.map(x=>`${x.symbol} ${x.weight.toFixed(0)}%`).join(" · ");return v65Module("allocator","Portfolio Opportunity Allocator",state,score,0,detail,blocked?"Do not add exposure.":`Allocate max ${Math.min(100,used).toFixed(0)}% of configured Paper risk budget.`,blocked?"BLOCK":budget.state==="WATCH"?"WARN":"INFO",{alloc,budget:budget.state})}
function v65PatternKey(x){const b=x.breadthState||"NO_BREADTH",reg=x.regime||"NO_REGIME",sess=x.session||"NO_SESSION",mtf=Number.isFinite(+x.mtf)?((x.direction==="LONG"?+x.mtf>=55:+x.mtf<=45)?"MTF_OK":"MTF_CONFLICT"):"MTF_NA";return `${x.direction||"?"}|${reg}|${b}|${sess}|${mtf}`}
function v65FailureMemory(){const resolved=researchJournalRows().filter(x=>Number.isFinite(metricR(x))),groups=new Map();for(const x of resolved){const k=v65PatternKey(x),g=groups.get(k)||{key:k,n:0,sum:0,loss:0};g.n++;g.sum+=metricR(x);if(metricR(x)<0)g.loss++;groups.set(k,g)}const bad=[...groups.values()].map(g=>({...g,avg:g.sum/g.n,lossRate:g.loss/g.n})).filter(g=>g.n>=3&&g.avg<-.08).sort((a,b)=>a.avg-b.avg),st=window.__radarState,ss=window.__signalState,current=st&&ss?v65PatternKey({direction:ss.tm?.direction,regime:st.q?.regime,breadthState:window.__marketBreadthV64?.state,session:st.j?.length?sessionForTs(+st.j.at(-1)[0]):null,mtf:ss.mc?.avg}):null,match=bad.find(g=>g.key===current),state=match?"FAILURE PATTERN MATCH":bad.length?"MEMORY ACTIVE":"LEARNING",score=match?20:bad.length?72:45,detail=match?`${match.key} · N${match.n} · ${match.avg.toFixed(2)}R`:bad[0]?`Worst: ${bad[0].key} · N${bad[0].n} · ${bad[0].avg.toFixed(2)}R`:`Need ≥3 resolved outcomes per pattern.`;return v65Module("failure","False-Signal / Failure Memory",state,score,0,detail,match?"Require extra confirmation; candidate filter must still pass OOS before promotion.":"Continue learning failure clusters.",match?"WARN":"INFO",{bad,match,current})}
function v65EventRisk(){const e=externalIntelState?.calendar?.summary||{},news=window.__intelNews||{},mins=Number(e.mins),newsLabel=String(news.risk||"N/A").toUpperCase(),newsHighCount=Number(news.high),black=String(e.risk||"").toUpperCase()==="BLACKOUT",near=Number.isFinite(mins)&&Math.abs(mins)<=90,highNews=newsLabel==="HIGH"||(Number.isFinite(newsHighCount)&&newsHighCount>0);let state="CLEAR",mult=1,score=90;if(black){state="BLACKOUT";mult=0;score=5}else if(near||highNews||String(e.risk||"").toUpperCase().includes("HIGH")){state="HIGH EVENT RISK";mult=.35;score=30}else if(String(e.risk||"").toUpperCase().includes("MED")||Number.isFinite(mins)&&Math.abs(mins)<=240||newsLabel==="ELEVATED"||newsLabel==="MEDIUM"){state="WATCH";mult=.7;score=62}const detail=`Calendar ${e.risk||"N/A"}${Number.isFinite(mins)?` · ${mins.toFixed(0)}m`:""} · news ${newsLabel}${Number.isFinite(newsHighCount)?` (${newsHighCount} high)`:""}`;return v65Module("event","Event Risk Engine",state,score,0,detail,state==="BLACKOUT"?"NO NEW TRADES":state==="HIGH EVENT RISK"?`Risk cap ${mult.toFixed(2)}× / wait event window`:`Risk cap ${mult.toFixed(2)}×`,state==="BLACKOUT"?"BLOCK":state!=="CLEAR"?"WARN":"INFO",{mult,mins,newsRisk:newsLabel,newsHigh:newsHighCount})}
function v65WhyWrong(){const losses=researchJournalRows().filter(x=>Number.isFinite(metricR(x))&&metricR(x)<0).sort((a,b)=>(+b.ts||0)-(+a.ts||0)),x=losses[0];if(!x)return v65Module("replay","Decision Replay / Why Was I Wrong?","NO LOSS TO REVIEW",55,0,"No resolved losing trade available.","Collect forward outcomes.");const r=typeof v60ReviewTrade==="function"?v60ReviewTrade(x):{grade:"?",processScore:50,diagnosis:"Loss available"},state=r.processScore>=70?"GOOD PROCESS / BAD OUTCOME":r.processScore>=50?"MIXED PROCESS":"PROCESS FAILURE",detail=`${coin(x.symbol)} ${x.direction} ${metricR(x).toFixed(2)}R · ${r.diagnosis}`;return v65Module("replay","Decision Replay / Why Was I Wrong?",state,r.processScore,0,detail,`Review ${new Date(x.ts).toLocaleDateString()} · grade ${r.grade}`,r.processScore<50?"WARN":"INFO",{trade:x,review:r})}
function v65WindowStats(ms){const now=Date.now(),rows=researchJournalRows().filter(x=>Number.isFinite(metricR(x))&&(+x.ts||0)>=now-ms),s=statPack(rows.map(metricR));return {...s}}
function v65ControlRoom(){const d=v65WindowStats(86400000),w=v65WindowStats(7*86400000),m=v65WindowStats(30*86400000),edge=typeof v61EdgeDriftSnapshot==="function"?v61EdgeDriftSnapshot(false):null,gov=typeof v61RiskGovernor==="function"?v61RiskGovernor(edge):null,cb=paperCircuitBreaker(),state=cb.state==="PAUSE"||edge?.state==="SEVERE"?"DEFENSIVE":w.n>=5&&w.avg>0&&w.pf>=1.1?"HEALTHY":w.n?"WATCH":"LEARNING",score=state==="HEALTHY"?85:state==="DEFENSIVE"?20:state==="WATCH"?58:45,detail=`Today N${d.n} ${d.n?d.avg.toFixed(2)+"R":"—"} · 7D N${w.n} ${w.n?w.avg.toFixed(2)+"R PF "+w.pf.toFixed(2):"—"} · 30D N${m.n}`;return v65Module("control","Live Performance Control Room",state,score,0,detail,`Governor ${gov?.state||"N/A"} ${Number.isFinite(+gov?.mult)?(+gov.mult).toFixed(2)+"×":""} · Paper CB ${cb.state}`,state==="DEFENSIVE"?"WARN":"INFO",{today:d,d7:w,d30:m,edge,governor:gov,circuit:cb})}
function v65KillSwitch(eventRisk=null,control=null){const ev=eventRisk||v65EventRisk(),ctl=control||v65ControlRoom(),edge=typeof v61EdgeDriftSnapshot==="function"?v61EdgeDriftSnapshot(false):null,gov=typeof v61RiskGovernor==="function"?v61RiskGovernor(edge):null,cb=paperCircuitBreaker(),ph=window.__providerHealthV62,interrupt=typeof v63InterruptionGuard==="function"?v63InterruptionGuard():{state:"N/A"},gap=typeof v63ExecutionGapStats==="function"?v63ExecutionGapStats():{n:0,mae:NaN,state:"LEARNING"},reasons=[];let hard=false,caution=false;const hardAdd=x=>{hard=true;reasons.push(x)},warn=x=>{caution=true;reasons.push(x)};if(cb.state==="PAUSE")hardAdd("Paper circuit breaker");if(gov?.mult===0||gov?.state==="PAUSE")hardAdd("Risk Governor PAUSE");if(edge?.state==="SEVERE")hardAdd("Severe edge drift");if(ev.state==="BLACKOUT")hardAdd("Macro/event BLACKOUT");if(interrupt.state==="SUSPECTED")hardAdd("Suspected market/data interruption");if(ph&&ph.state!=="NEÎNCERCAT"&&(+ph.score||0)<50)hardAdd(`Provider health ${(+ph.score||0).toFixed(0)}/100`);else if(ph&&ph.state!=="NEÎNCERCAT"&&(+ph.score||0)<75)warn(`Provider health ${(+ph.score||0).toFixed(0)}/100`);if(gap.n>=8&&Number.isFinite(+gap.mae)&&+gap.mae>25)hardAdd(`Execution gap MAE ${(+gap.mae).toFixed(1)}bps`);else if(gap.n>=8&&Number.isFinite(+gap.mae)&&+gap.mae>15)warn(`Execution gap MAE ${(+gap.mae).toFixed(1)}bps`);if(ctl.state==="DEFENSIVE")warn("Performance control defensive");if(ev.state==="HIGH EVENT RISK")warn("High event risk");const state=hard?"NO NEW TRADES":caution?"CAUTION":"NORMAL",score=hard?0:caution?45:95;return v65Module("kill","Kill Switch / Capital Preservation",state,score,0,reasons.join(" · ")||"No capital-preservation blocker detected.",hard?"BLOCK ALL NEW PAPER ENTRIES":caution?"REDUCE / WAIT FOR CLEANER CONDITIONS":"NORMAL OPERATION",hard?"BLOCK":caution?"WARN":"INFO",{hard,caution,reasons})}
function v65DecisionSuite(persist=false){const regime=v65RegimeIntelligence(),structure=v65LiquidityStructure(),cross=v65CrossAssetConfirmation(),conflict=v65ConflictResolver(),entry=v65AdaptiveEntry(window.__radarState,window.__signalState,conflict),exit=v65DynamicExit(window.__radarState,window.__signalState,conflict),allocator=v65PortfolioAllocator(),failure=v65FailureMemory(),event=v65EventRisk(),replay=v65WhyWrong(),control=v65ControlRoom(),kill=v65KillSwitch(event,control),modules=[regime,structure,cross,conflict,entry,exit,allocator,failure,event,replay,control,kill],scores=modules.filter(x=>Number.isFinite(+x.score)).map(x=>+x.score),quality=scores.length?scores.reduce((a,b)=>a+b,0)/scores.length:0,dirMods=[regime,structure,cross].filter(x=>Number.isFinite(+x.bias)),alignment=dirMods.length?dirMods.reduce((a,x)=>a+x.bias,0)/dirMods.length:0,state=kill.state==="NO NEW TRADES"?"CAPITAL PRESERVATION":conflict.state==="HIGH CONFLICT"||event.state==="BLACKOUT"?"WAIT":quality>=72?"DECISION READY":quality>=55?"CAUTION":"LEARNING",summary={state,quality,alignment,kill:kill.state,entry:entry.state,exit:exit.state};const out={ts:Date.now(),version:"v65",market:assetClass(),symbol:window.__radarState?.symbol||norm($("symbol")?.value||""),tf:window.__radarState?.tf||$("tf")?.value||"",modules,summary,killSwitch:kill,entry,exit,conflict,regime,structure,crossAsset:cross,allocator,failure,eventRisk:event,replay,control};window.__decisionIntelV65=out;if(persist&&localDbSupported()&&!appSettings().privacySessionOnly)localDbPutRecord("decision_intel_v65",`${Math.floor(out.ts/300000)}|${out.market}|${out.symbol}|${out.tf}`,out,out.ts).catch(()=>{});return out}
function v65ToolClass(m){return m.severity==="BLOCK"||String(m.state).includes("NO NEW")?"bad":m.severity==="WARN"||String(m.state).includes("CAUTION")||String(m.state).includes("CONFLICT")||String(m.state).includes("WATCH")?"warn":"good"}
function v65ToolHtml(m,i){return `<div class="decisionTool ${v65ToolClass(m)}"><div class="decisionToolHead"><b><span class="decisionToolNum">${String(i+1).padStart(2,"0")}</span>${escapeHtml(m.label)}</b><span class="decisionToolState">${escapeHtml(m.state)}</span></div><div class="decisionToolScore">${Math.round(m.score)}/100</div><div class="decisionToolDetail">${escapeHtml(m.detail||"—")}</div><div class="decisionToolAction">${escapeHtml(m.action||"")}</div></div>`}
function renderV65DecisionOS(persist=false){const has=!!window.__radarState,out=v65DecisionSuite(persist),cls=out.summary.state==="DECISION READY"?"good":out.summary.state==="CAPITAL PRESERVATION"?"bad":"neutral",summary=`${out.market} · ${out.symbol||"—"} · ${out.tf||"—"} · conflict ${out.conflict.state} · event ${out.eventRisk.state}`;for(const id of ["v65DashState","v65DecisionState"]){if($(id)){$(id).textContent=has?out.summary.state:"WAIT DATA";$(id).className="decisionOsState "+(has?cls:"neutral")}}for(const id of ["v65DashSummary","v65DecisionSummary"])if($(id))$(id).textContent=has?summary:"Run analysis first.";for(const id of ["v65DashScore","v65DecisionScore"])if($(id))$(id).textContent=has?Math.round(out.summary.quality)+"/100":"—";for(const id of ["v65DashKill","v65DecisionKill"])if($(id)){$(id).textContent=has?out.killSwitch.state:"—";$(id).className=out.killSwitch.state==="NO NEW TRADES"?"bad":out.killSwitch.state==="CAUTION"?"neutral":"good"}for(const id of ["v65DashEntry","v65DecisionEntry"])if($(id))$(id).textContent=has?out.entry.state:"—";for(const id of ["v65DashExit","v65DecisionExit"])if($(id))$(id).textContent=has?out.exit.state:"—";const markup=has?out.modules.map(v65ToolHtml).join(""):`<div class="emptyState">Run analysis first.</div>`;if($("v65DashGrid"))$("v65DashGrid").innerHTML=markup;if($("v65DecisionGrid"))$("v65DecisionGrid").innerHTML=markup;if($("masterDecisionOS"))$("masterDecisionOS").textContent=has?`${out.summary.state} · ${Math.round(out.summary.quality)}/100`:"N/A";if($("masterKillSwitch")){$("masterKillSwitch").textContent=has?out.killSwitch.state:"N/A";$("masterKillSwitch").className=out.killSwitch.state==="NO NEW TRADES"?"bad":out.killSwitch.state==="CAUTION"?"neutral":"good"}return out}
async function refreshV65DecisionOS(force=false){if(force&&window.__radarState){await Promise.allSettled([loadContextIntel(true),refreshMarketBreadthV64(true,false)]);}const out=renderV65DecisionOS(true);if(window.__radarState)renderMasterVerdict();return out}
function v65PaperEntryAllowed(){const k=v65KillSwitch();if(k.state==="NO NEW TRADES"){toast(`Kill Switch: ${k.detail}`,"bad");return false}return true}


// v66 · Real-Time Edge Validation & Calibration Pro
const V66_VERSION="v66";
let v66SuiteCache={key:null,ts:0,value:null};
const V66_FACTORS=[
 {key:"confidence",label:"Confidence"},{key:"trend",label:"Trend"},{key:"momentum",label:"Momentum"},{key:"volume",label:"Volume"},{key:"structure",label:"Structure"},{key:"mtf",label:"MTF"},{key:"micro",label:"Order flow"},{key:"breadth",label:"Market breadth"},{key:"context",label:"Cross-asset"},{key:"news",label:"Event/news risk"},{key:"decision",label:"Decision OS"},{key:"conflict",label:"Conflict"}
];
function v66Clamp(x,a=0,b=100){return Math.max(a,Math.min(b,Number.isFinite(+x)?+x:0))}
function v66Rows(){const market=assetClass(),source=analysisSource();return chronologicalRows(researchJournalRows().filter(x=>Number.isFinite(metricR(x))&&prMarketOf(x)===market&&((x.source||"BINANCE")===source))).map(x=>({...x,_r:metricR(x)}))}
function v66MeanCi(vals){const a=(vals||[]).filter(Number.isFinite),n=a.length;if(!n)return {n:0,mean:0,lo:NaN,hi:NaN,sd:NaN};const mean=a.reduce((x,y)=>x+y,0)/n;if(n<2)return {n,mean,lo:NaN,hi:NaN,sd:0};const sd=Math.sqrt(a.reduce((s,x)=>s+(x-mean)**2,0)/(n-1)),se=sd/Math.sqrt(n),z=n<10?2.262:n<20?2.101:n<30?2.045:1.96;return {n,mean,lo:mean-z*se,hi:mean+z*se,sd}}
function v66Pf(vals){const gp=vals.filter(x=>x>0).reduce((a,b)=>a+b,0),gl=-vals.filter(x=>x<0).reduce((a,b)=>a+b,0);return gl?gp/gl:gp?99:0}
function v66OutcomeTracker(rows=v66Rows()){const vals=rows.map(x=>x._r),st=statPack(vals),correct=vals.filter(x=>x>.05).length,wrong=vals.filter(x=>x<-.05).length,neutral=vals.length-correct-wrong,last=rows.slice(-20),recent=statPack(last.map(x=>x._r)),state=st.n<20?"COLLECTING":st.avg>0&&st.pf>=1.15?"POSITIVE OBSERVED EDGE":st.avg<0||st.pf<.95?"NEGATIVE OBSERVED EDGE":"MIXED";return {state,score:st.n?Math.round(v66Clamp(50+st.avg*35+(st.pf-1)*15)):20,detail:`N${st.n} · ${st.avg.toFixed(2)}R · PF ${st.pf.toFixed(2)} · W/L/N ${correct}/${wrong}/${neutral}`,action:`Recent20 ${recent.n?recent.avg.toFixed(2)+"R · PF "+recent.pf.toFixed(2):"insufficient"}`,stats:st,recent,correct,wrong,neutral}}
function v66Calibration(rows=v66Rows()){const defs=[[50,59],[60,64],[65,69],[70,74],[75,79],[80,89],[90,100]],buckets=[],all=[];let total=0,ece=0,brier=0;for(const [lo,hi] of defs){const z=rows.filter(x=>{const c=Math.max(+x.longConf||0,+x.shortConf||0);return c>=lo&&c<=hi}),n=z.length,w=z.filter(x=>x._r>0).length,pred=n?z.reduce((a,x)=>a+Math.max(+x.longConf||0,+x.shortConf||0),0)/n/100:NaN,obs=n?w/n:NaN,shrunk=n?(w+5)/(n+10):NaN,gap=n?Math.abs(pred-obs):NaN,avg=n?z.reduce((a,x)=>a+x._r,0)/n:NaN;if(n){total+=n;ece+=gap*n;for(const x of z){const p=Math.max(+x.longConf||0,+x.shortConf||0)/100,y=x._r>0?1:0;brier+=(p-y)**2;all.push({p,y})}}buckets.push({range:`${lo}-${hi}`,n,pred,obs,shrunk,gap,avg})}ece=total?ece/total*100:NaN;brier=total?brier/total:NaN;const state=total<30?"LOW SAMPLE":ece<=8?"WELL CALIBRATED":ece<=15?"WATCH":"MISCALIBRATED",score=total<10?20:v66Clamp(100-(Number.isFinite(ece)?ece*3:50))*Math.min(1,total/60);return {state,score,detail:`N${total} · ECE ${Number.isFinite(ece)?ece.toFixed(1)+"pp":"—"} · Brier ${Number.isFinite(brier)?brier.toFixed(3):"—"}`,action:state==="MISCALIBRATED"?"Do not treat raw confidence as probability.":"Use empirical bucket rates alongside raw confidence.",n:total,ece,brier,buckets}}
function v66Dir(x){return x.direction==="SHORT"?-1:x.direction==="LONG"?1:0}
function v66FactorValue(x,key){const d=v66Dir(x),norm=v=>v!=null&&v!==""&&Number.isFinite(+v)?Math.max(-1,Math.min(1,(+v-50)/50)):NaN;if(key==="confidence"){const c=Math.max(+x.longConf||0,+x.shortConf||0);return Number.isFinite(c)?Math.max(-1,Math.min(1,(c-50)/50)):NaN}if(key==="trend")return d?d*norm(x.trendScore):NaN;if(key==="momentum")return d?d*norm(x.momScore):NaN;if(key==="volume")return norm(x.volScore);if(key==="structure")return d?d*norm(x.structureScore):NaN;if(key==="mtf")return d?d*norm(x.mtf):NaN;if(key==="micro"){if(Number.isFinite(+x.microDeltaPct))return d*Math.max(-1,Math.min(1,+x.microDeltaPct/35));if(Number.isFinite(+x.microScore))return d*norm(x.microScore);return NaN}if(key==="breadth"){if(Number.isFinite(+x.breadthAlignment))return Math.max(-1,Math.min(1,+x.breadthAlignment));return d&&Number.isFinite(+x.breadthScore)?d*norm(x.breadthScore):NaN}if(key==="context")return d&&Number.isFinite(+x.contextScore)?d*norm(x.contextScore):NaN;if(key==="news"){const s=String(x.eventRiskV65||x.newsRisk||"").toUpperCase();if(s.includes("BLACKOUT"))return -1;if(s.includes("HIGH"))return -.7;if(s.includes("ELEVATED"))return -.35;if(s.includes("LOW")||s.includes("CLEAR"))return .2;const n=Number(x.newsRisk);return Number.isFinite(n)?Math.max(-1,Math.min(1,.4-n/100)):NaN}if(key==="decision")return Number.isFinite(+x.decisionOsScore)?norm(x.decisionOsScore):NaN;if(key==="conflict"){const s=String(x.conflictStateV65||"");return s==="CLEAR"?.5:s==="MIXED"?-.15:s.includes("HIGH")?-.8:NaN}return NaN}
function v66Pearson(pairs){const a=pairs.filter(x=>Number.isFinite(x[0])&&Number.isFinite(x[1]));if(a.length<3)return NaN;const mx=a.reduce((s,x)=>s+x[0],0)/a.length,my=a.reduce((s,x)=>s+x[1],0)/a.length;let num=0,dx=0,dy=0;for(const [x,y] of a){num+=(x-mx)*(y-my);dx+=(x-mx)**2;dy+=(y-my)**2}return dx&&dy?num/Math.sqrt(dx*dy):NaN}
function v66Contribution(rows=v66Rows()){const items=V66_FACTORS.map(f=>{const z=rows.map(x=>({x,v:v66FactorValue(x,f.key),r:x._r})).filter(o=>Number.isFinite(o.v)),aligned=z.filter(o=>o.v>.15).map(o=>o.r),opposed=z.filter(o=>o.v<-.15).map(o=>o.r),corr=v66Pearson(z.map(o=>[o.v,o.r])),a=v66MeanCi(aligned),o=v66MeanCi(opposed),delta=(a.n&&o.n)?a.mean-o.mean:NaN,state=z.length<12?"INSUFFICIENT":Number.isFinite(corr)&&corr>=.12?"HELPFUL":Number.isFinite(corr)&&corr<=-.12?"HARMFUL":"MIXED";return {...f,n:z.length,corr,aligned:a,opposed:o,delta,state}}).sort((a,b)=>Math.abs(b.corr||0)-Math.abs(a.corr||0));const usable=items.filter(x=>x.n>=12&&Number.isFinite(x.corr)),helpful=usable.filter(x=>x.corr>.12).length,harmful=usable.filter(x=>x.corr<-.12).length,state=rows.length<20?"LEARNING":harmful>helpful?"NOISY / DEGRADING":"ATTRIBUTION AVAILABLE",score=v66Clamp(50+(helpful-harmful)*6+Math.min(20,rows.length/3));return {state,score,detail:`${helpful} helpful · ${harmful} harmful · ${usable.length} testable factors`,action:"Observational attribution only; confirm with forward/ablation evidence.",items}}
function v66CompositeScore(x,skip=null){const vals=V66_FACTORS.filter(f=>f.key!==skip).map(f=>v66FactorValue(x,f.key)).filter(Number.isFinite);return vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:NaN}
function v66Ablation(rows=v66Rows()){const full=v66Pearson(rows.map(x=>[v66CompositeScore(x),x._r])),items=V66_FACTORS.map(f=>{const corr=v66Pearson(rows.map(x=>[v66CompositeScore(x,f.key),x._r])),delta=Number.isFinite(full)&&Number.isFinite(corr)?full-corr:NaN,state=!Number.isFinite(delta)||rows.length<20?"INSUFFICIENT":delta>.025?"ADDS VALUE":delta<-.025?"HURTS PROXY":"NEUTRAL";return {...f,corr,delta,state}}).sort((a,b)=>(b.delta||0)-(a.delta||0));return {state:rows.length<20?"LOW SAMPLE":"PROXY ABLATION",score:rows.length<20?30:v66Clamp(60+(Number.isFinite(full)?full*80:0)),detail:`Full score/outcome corr ${Number.isFinite(full)?full.toFixed(2):"—"} · N${rows.length}`,action:"Removing a module is a historical proxy, not a causal experiment.",full,items}}
function v66DnaKey(x){const rg=typeof canonicalRegime==="function"?canonicalRegime(x):String(x.regime||"UNKNOWN"),br=String(x.breadthState||"NA"),sess=String(x.session||"NA"),entry=String(x.entryEngine||"NA").replaceAll(" ","_"),cf=String(x.conflictStateV65||"NA").replaceAll(" ","_");return `${x.direction||"WAIT"}|${rg}|${br}|${sess}|${entry}|${cf}`}
function v66CurrentDnaRow(){const st=window.__radarState,ss=window.__signalState,d=window.__decisionIntelV65||v65DecisionSuite(false);return {direction:ss?.tm?.direction||"WAIT",regime:st?.q?.regime||d.regime?.state||"UNKNOWN",breadthState:window.__marketBreadthV64?.state||"NA",session:st?.j?.length?sessionForTs(+st.j.at(-1)[0]):"NA",entryEngine:d.entry?.state||"NA",conflictStateV65:d.conflict?.state||"NA"}}
function v66DnaGroups(rows=v66Rows()){const m=new Map();for(const x of rows){const k=v66DnaKey(x);if(!m.has(k))m.set(k,[]);m.get(k).push(x._r)}return [...m.entries()].map(([key,vals])=>{const st=statPack(vals),ci=v66MeanCi(vals);let state="NEUTRAL";if(st.n>=15&&st.avg>=.10&&st.pf>=1.20&&(!Number.isFinite(ci.lo)||ci.lo>-.08))state="WHITELIST";if(st.n>=12&&(st.avg<=-.10||st.pf<.85)&&Number.isFinite(ci.hi)&&ci.hi<.10)state="BLACKLIST";return {key,...st,ci,state}}).sort((a,b)=>b.n-a.n)}
function v66SetupDNA(rows=v66Rows()){const key=v66DnaKey(v66CurrentDnaRow()),groups=v66DnaGroups(rows),g=groups.find(x=>x.key===key)||{key,n:0,avg:0,pf:0,dd:0,win:0,ci:{lo:NaN,hi:NaN},state:"LEARNING"},state=g.n<12?"LEARNING":g.state,score=g.n<5?25:state==="WHITELIST"?90:state==="BLACKLIST"?15:v66Clamp(55+g.avg*40+(g.pf-1)*15);return {state,score,detail:`${key.replaceAll("|"," · ")} · N${g.n} · ${g.n?g.avg.toFixed(2)+"R · PF "+g.pf.toFixed(2):"no resolved sample"}`,action:state==="BLACKLIST"?"Research blacklist: require new forward evidence before reuse.":state==="WHITELIST"?"Research whitelist candidate; still obey risk gates.":"Collect more same-DNA outcomes.",key,current:g,groups}}
function v66EdgeDecay(rows=v66Rows()){const n=rows.length,recent=rows.slice(-20),base=rows.slice(Math.max(0,n-80),Math.max(0,n-20)),rs=statPack(recent.map(x=>x._r)),bs=statPack(base.map(x=>x._r)),delta=recent.length&&base.length?rs.avg-bs.avg:NaN;let state="LEARNING",score=45;if(recent.length>=15&&base.length>=20){if(rs.avg<=-.15&&rs.pf<.85&&delta<=-.20){state="SEVERE";score=10}else if((rs.avg<0&&rs.pf<1)||delta<=-.15){state="DRIFT";score=30}else if(delta<=-.08||rs.pf<1.1){state="WATCH";score=58}else{state="STABLE";score=88}}return {state,score,detail:`Recent N${recent.length} ${recent.length?rs.avg.toFixed(2)+"R PF "+rs.pf.toFixed(2):"—"} · baseline N${base.length} ${base.length?bs.avg.toFixed(2)+"R":"—"} · Δ ${Number.isFinite(delta)?delta.toFixed(2)+"R":"—"}`,action:state==="SEVERE"?"Pause new Paper research for this source until evidence recovers.":state==="DRIFT"?"Risk Governor should remain defensive.":"Continue monitoring.",recent:rs,baseline:bs,delta}}
function v66RegimePolicies(rows=v66Rows()){const m=new Map();for(const x of rows){const rg=typeof canonicalRegime==="function"?canonicalRegime(x):String(x.regime||"UNKNOWN");if(!m.has(rg))m.set(rg,[]);m.get(rg).push(x)}const policies=[...m.entries()].map(([regime,z])=>{const st=statPack(z.map(x=>x._r)),confs=z.map(x=>Math.max(+x.longConf||0,+x.shortConf||0)).filter(Number.isFinite),base=appSettings().signalMin;let risk=1,threshold=base;if(st.n<10){risk=.5;threshold=Math.max(base,68)}else if(st.avg<0||st.pf<1){risk=.25;threshold=Math.max(base,72)}else if(st.avg<.08||st.pf<1.15){risk=.6;threshold=Math.max(base,68)}else{risk=1;threshold=Math.max(60,base-2)}return {regime,...st,risk,threshold,medianConf:confs.length?percentile(confs,.5):NaN}}).sort((a,b)=>b.n-a.n),cur=v65RegimeClass(window.__radarState?.q||{}),p=policies.find(x=>String(cur).includes(x.regime)||String(x.regime).includes(cur))||policies[0]||null;return {state:p?(p.n>=10?(p.risk>=.75?"SUPPORTED":"DEFENSIVE"):"LEARNING"):"NO DATA",score:p?v66Clamp(40+p.risk*45+Math.min(15,p.n)):20,detail:p?`${p.regime} · N${p.n} · ${p.avg.toFixed(2)}R · PF ${p.pf.toFixed(2)} · threshold ${p.threshold} · risk ${p.risk.toFixed(2)}×`:"No regime evidence.",action:"Research policy suggestion only; champion/governor promotion rules still apply.",current:p,policies}}
function v66CalibrationWindows(rows=v66Rows()){const now=Date.now(),defs=[["24H",86400000],["7D",7*86400000],["30D",30*86400000],["90D",90*86400000]],windows=defs.map(([label,ms])=>{const z=rows.filter(x=>(+x.ts||0)>=now-ms),s=statPack(z.map(x=>x._r)),c=v66Calibration(z);return {label,...s,ece:c.ece}});const d30=windows.find(x=>x.label==="30D");return {state:d30&&d30.n>=20?(d30.avg>0?"POSITIVE":"WEAK"):"LOW SAMPLE",score:d30?v66Clamp(40+Math.min(30,d30.n)+d30.avg*25):20,detail:windows.map(x=>`${x.label} N${x.n} ${x.n?x.avg.toFixed(2)+"R":"—"}`).join(" · "),action:"Use window drift to separate current edge from long-history averages.",windows}}
function v66Attribution(rows=v66Rows()){const x=rows.at(-1);if(!x)return {state:"NO DATA",score:20,detail:"No resolved trade for attribution.",action:"Collect resolved outcomes.",rows:[]};const parts=V66_FACTORS.map(f=>({label:f.label,key:f.key,v:v66FactorValue(x,f.key)})).filter(o=>Number.isFinite(o.v)).sort((a,b)=>Math.abs(b.v)-Math.abs(a.v)),pos=parts.filter(x=>x.v>.12).slice(0,3),neg=parts.filter(x=>x.v<-.12).slice(0,3),r=x._r,state=r>0?"WIN REVIEW":r<0?"LOSS REVIEW":"FLAT REVIEW",review=typeof v60ReviewTrade==="function"?v60ReviewTrade(x):null;return {state,score:review?.processScore??v66Clamp(50+r*15),detail:`${coin(x.symbol)} ${x.direction} ${r.toFixed(2)}R · + ${pos.map(x=>x.label).join(', ')||'none'} · - ${neg.map(x=>x.label).join(', ')||'none'}`,action:review?.diagnosis||"Attribution is descriptive; avoid post-hoc causal claims.",trade:x,positive:pos,negative:neg,review}}
function v66ResearchLists(rows=v66Rows()){const groups=v66DnaGroups(rows),white=groups.filter(x=>x.state==="WHITELIST").sort((a,b)=>b.avg-a.avg),black=groups.filter(x=>x.state==="BLACKLIST").sort((a,b)=>a.avg-b.avg),state=black.length?"BLACKLIST ACTIVE":white.length?"WHITELIST CANDIDATES":"LEARNING";return {state,score:v66Clamp(55+Math.min(25,white.length*5)-Math.min(20,black.length*3)),detail:`Whitelist ${white.length} · blacklist ${black.length} · mature DNA ${groups.filter(x=>x.n>=12).length}`,action:"Lists are research governance; they do not bypass current market/risk gates.",white,black,groups}}
function v66PaperStats(){const rows=paperTrades().map(paperMigrateTrade).filter(t=>paperTerminalStatus(t)&&(+t.riskUsd||0)>0).map(t=>(+t.realizedUsd||0)/(+t.riskUsd||1));return statPack(rows)}
function v66ShadowStats(){const rows=shadowTradesV60().filter(x=>Number.isFinite(+x.netR)).map(x=>+x.netR);return statPack(rows)}
function v66ForwardStats(rows=v66Rows()){const s=forwardStart(),z=s?rows.filter(x=>(+x.ts||0)>=s):[];return statPack(z.map(x=>x._r))}
async function v66LoadReplayStats(){try{const rec=(await localDbRecords("historical_replay",0,10000)).map(x=>x.data).filter(x=>x&&Number.isFinite(+x.outcome?.netPct)),vals=rec.map(x=>+x.outcome.netPct),n=vals.length,avg=n?vals.reduce((a,b)=>a+b,0)/n:0,hit=n?vals.filter(x=>x>0).length/n:0;window.__v66ReplayStats={n,avg,hit,unit:"%"};return window.__v66ReplayStats}catch{return window.__v66ReplayStats={n:0,avg:0,hit:0,unit:"%"}}}
function v66LayerComparison(rows=v66Rows()){const hist=window.__v66ReplayStats||{n:0,avg:0,hit:0,unit:"%"},journal=statPack(rows.map(x=>x._r)),paper=v66PaperStats(),shadow=v66ShadowStats(),forward=v66ForwardStats(rows),layers=[{name:"Historical replay",n:hist.n,avg:hist.avg,hit:hist.hit,unit:"%"},{name:"Resolved journal",n:journal.n,avg:journal.avg,hit:journal.win,unit:"R"},{name:"Paper",n:paper.n,avg:paper.avg,hit:paper.win,unit:"R"},{name:"Shadow",n:shadow.n,avg:shadow.avg,hit:shadow.win,unit:"R"},{name:"Forward",n:forward.n,avg:forward.avg,hit:forward.win,unit:"R"}],mature=layers.filter(x=>x.n>=10).length,state=mature>=3?"MULTI-LAYER EVIDENCE":mature>=1?"PARTIAL EVIDENCE":"LOW SAMPLE";return {state,score:v66Clamp(25+mature*14+Math.min(20,forward.n)),detail:layers.map(x=>`${x.name} N${x.n}`).join(" · "),action:"Compare direction and degradation across layers; units differ for replay % vs R-based execution layers.",layers}}
function v66DataSufficiency(rows=v66Rows(),cal=null,dna=null,layers=null){cal=cal||v66Calibration(rows);dna=dna||v66SetupDNA(rows);layers=layers||v66LayerComparison(rows);const forward=v66ForwardStats(rows),paper=v66PaperStats(),shadow=v66ShadowStats(),regimes=new Map();for(const x of rows){const r=typeof canonicalRegime==="function"?canonicalRegime(x):String(x.regime||"UNKNOWN");regimes.set(r,(regimes.get(r)||0)+1)}const regimeMature=[...regimes.values()].filter(n=>n>=10).length,bucketMature=cal.buckets.filter(x=>x.n>=10).length,components={resolved:Math.min(100,rows.length/150*100),forward:Math.min(100,forward.n/60*100),paper:Math.min(100,paper.n/50*100),shadow:Math.min(100,shadow.n/30*100),dna:Math.min(100,(dna.current?.n||0)/20*100),regimes:Math.min(100,regimeMature/3*100),calibration:Math.min(100,bucketMature/4*100)},score=Math.round(.22*components.resolved+.18*components.forward+.14*components.paper+.12*components.shadow+.12*components.dna+.10*components.regimes+.12*components.calibration),state=score>=75?"HIGH":score>=50?"MEDIUM":"LOW";return {state,score,detail:`Resolved ${rows.length}/150 · forward ${forward.n}/60 · Paper ${paper.n}/50 · Shadow ${shadow.n}/30 · DNA ${dna.current?.n||0}/20`,action:state==="LOW"?"Do not promote, blacklist or size up from sparse evidence.":"Use confidence intervals and forward evidence before promotion.",components,forward,paper,shadow,regimeMature,bucketMature}}
function v66VerdictQuality(rows=v66Rows(),cal=null,suff=null,decay=null,layers=null){cal=cal||v66Calibration(rows);decay=decay||v66EdgeDecay(rows);layers=layers||v66LayerComparison(rows);suff=suff||v66DataSufficiency(rows,cal,null,layers);const data=v66Clamp(masterDataQuality()),calScore=Number.isFinite(cal.ece)?v66Clamp(100-cal.ece*3):25,stability=decay.state==="STABLE"?90:decay.state==="WATCH"?65:decay.state==="DRIFT"?35:decay.state==="SEVERE"?5:45,gap=typeof v63ExecutionGapStats==="function"?v63ExecutionGapStats():{n:0,mae:NaN},execution=gap.n>=8&&Number.isFinite(gap.mae)?v66Clamp(100-gap.mae*4):Math.min(55,15+gap.n*5),score=Math.round(.24*suff.score+.22*calScore+.19*stability+.15*execution+.20*data),state=score>=80?"HIGH QUALITY":score>=65?"USABLE":score>=50?"CAUTION":"LOW CONFIDENCE";return {state,score,detail:`Evidence ${suff.score}/100 · calibration ${calScore.toFixed(0)} · stability ${stability} · execution ${execution.toFixed(0)} · data ${data.toFixed(0)}`,action:state==="LOW CONFIDENCE"?"Treat verdict as research-only WAIT/low conviction.":"Quality describes evidence reliability, not expected profit.",components:{sufficiency:suff.score,calibration:calScore,stability,execution,data}}}
function v66SignalSnapshot(){const rows=v66Rows(),cal=v66Calibration(rows),dna=v66SetupDNA(rows),decay=v66EdgeDecay(rows),layers=v66LayerComparison(rows),suff=v66DataSufficiency(rows,cal,dna,layers),quality=v66VerdictQuality(rows,cal,suff,decay,layers);return {ts:Date.now(),quality:quality.score,qualityState:quality.state,dnaKey:dna.key,dnaState:dna.state,dnaN:dna.current?.n||0,edgeDecay:decay.state,sufficiency:suff.score,sufficiencyState:suff.state}}
function v66EdgeValidationSuite(persist=false){const rows=v66Rows(),liveKey=v66DnaKey(v66CurrentDnaRow()),last=rows.at(-1),cacheKey=`${assetClass()}|${analysisSource()}|${rows.length}|${last?.ts||0}|${liveKey}`;if(!persist&&v66SuiteCache.key===cacheKey&&Date.now()-v66SuiteCache.ts<5000&&v66SuiteCache.value)return v66SuiteCache.value;const outcome=v66OutcomeTracker(rows),cal=v66Calibration(rows),contrib=v66Contribution(rows),ablation=v66Ablation(rows),dna=v66SetupDNA(rows),decay=v66EdgeDecay(rows),regime=v66RegimePolicies(rows),windows=v66CalibrationWindows(rows),attribution=v66Attribution(rows),lists=v66ResearchLists(rows),layers=v66LayerComparison(rows),suff=v66DataSufficiency(rows,cal,dna,layers),quality=v66VerdictQuality(rows,cal,suff,decay,layers),matureBlacklist=dna.state==="BLACKLIST"&&(dna.current?.n||0)>=20&&Number.isFinite(dna.current?.ci?.hi)&&dna.current.ci.hi<0,hardBlock=(decay.state==="SEVERE"&&decay.recent.n>=15&&decay.baseline.n>=20)||matureBlacklist,state=hardBlock?"EDGE BLOCK":quality.score>=80&&suff.score>=65?"VALIDATED / MONITOR":quality.score>=60?"USABLE / COLLECT":"LEARNING",modules=[
 {key:"outcome",label:"Real-Time Verdict Outcome Tracker",...outcome},{key:"calibration",label:"Confidence Calibration Pro",...cal},{key:"contribution",label:"Module Contribution Analyzer",...contrib},{key:"ablation",label:"Ablation Testing",...ablation},{key:"quality",label:"Verdict Quality Score",...quality},{key:"dna",label:"Setup DNA",...dna},{key:"decay",label:"Edge Decay Alarm",...decay},{key:"regimePolicy",label:"Regime-Specific Policies",...regime},{key:"windows",label:"Live Calibration 24H/7D/30D/90D",...windows},{key:"attribution",label:"Decision Attribution",...attribution},{key:"lists",label:"Auto Whitelist / Blacklist Research",...lists},{key:"layers",label:"Backtest / Paper / Shadow / Forward",...layers},{key:"sufficiency",label:"Data Sufficiency Meter",...suff}
 ];const x={ts:Date.now(),version:"v66",market:assetClass(),source:analysisSource(),symbol:window.__radarState?.symbol||norm($("symbol")?.value||""),tf:window.__radarState?.tf||$("tf")?.value||"",state,score:quality.score,hardBlock,hardReasons:[decay.state==="SEVERE"?"SEVERE_EDGE_DECAY":null,matureBlacklist?"MATURE_DNA_BLACKLIST":null].filter(Boolean),modules,outcome,calibration:cal,contribution:contrib,ablation,quality,dna,decay,regimePolicy:regime,windows,attribution,lists,layers,sufficiency:suff};window.__edgeValidationV66=x;v66SuiteCache={key:cacheKey,ts:Date.now(),value:x};if(persist&&localDbSupported()&&!appSettings().privacySessionOnly)localDbPutRecord("edge_validation_v66",`${Math.floor(x.ts/300000)}|${x.market}|${x.source}|${x.symbol}|${x.tf}`,x,x.ts).catch(()=>{});return x}
function v66ToolHtml(m,i){const sev=m.key==="decay"&&["SEVERE","DRIFT"].includes(m.state)?"bad":m.key==="dna"&&m.state==="BLACKLIST"?"bad":m.state?.includes?.("LOW")||m.state?.includes?.("WATCH")||m.state?.includes?.("CAUTION")||m.state?.includes?.("MIXED")||m.state?.includes?.("LEARNING")?"warn":m.state?.includes?.("POSITIVE")||m.state?.includes?.("VALID")||m.state?.includes?.("HIGH")||m.state?.includes?.("WELL")||m.state?.includes?.("STABLE")||m.state?.includes?.("WHITELIST")?"good":"";return `<div class="decisionTool ${sev}"><div class="decisionToolHead"><b><span class="decisionToolNum">${String(i+1).padStart(2,'0')}</span>${escapeHtml(m.label)}</b><span class="decisionToolState">${escapeHtml(m.state||"N/A")}</span></div><div class="decisionToolScore">${Number.isFinite(+m.score)?Math.round(+m.score)+"/100":"—"}</div><div class="decisionToolDetail">${escapeHtml(m.detail||"")}</div><div class="decisionToolAction">${escapeHtml(m.action||"")}</div></div>`}
function v66CalibrationMarkup(cal){return `<div class="edgeCalRow head"><span>Bucket</span><span>N</span><span>Pred/obs</span><span>Avg R</span></div>`+cal.buckets.map(x=>`<div class="edgeCalRow ${x.n>=10&&x.gap>.15?'bad':x.n>=10&&x.gap<=.08?'good':''}"><span>${x.range}</span><b>${x.n}</b><span>${x.n?`${(x.pred*100).toFixed(0)}% / ${(x.obs*100).toFixed(0)}%`:'—'}</span><span>${x.n?x.avg.toFixed(2)+'R':'—'}</span></div>`).join("")}
function v66ContributionMarkup(c,a){const top=c.items.slice(0,6);return `<div class="edgeCalRow head"><span>Factor</span><span>N</span><span>Corr</span><span>Abl Δ</span></div>`+top.map(x=>{const ab=a.items.find(z=>z.key===x.key),cl=x.state==="HELPFUL"?'good':x.state==="HARMFUL"?'bad':'';return `<div class="edgeCalRow ${cl}"><span>${escapeHtml(x.label)}</span><b>${x.n}</b><span>${Number.isFinite(x.corr)?x.corr.toFixed(2):'—'}</span><span>${Number.isFinite(ab?.delta)?(ab.delta>=0?'+':'')+ab.delta.toFixed(3):'—'}</span></div>`}).join("")}
function v66LayersMarkup(l){return `<div class="edgeCalRow head"><span>Layer</span><span>N</span><span>Avg</span><span>Hit</span></div>`+l.layers.map(x=>`<div class="edgeCalRow ${x.n>=10&&x.avg>0?'good':x.n>=10&&x.avg<0?'bad':''}"><span>${escapeHtml(x.name)}</span><b>${x.n}</b><span>${x.n?x.avg.toFixed(2)+x.unit:'—'}</span><span>${x.n?(x.hit*100).toFixed(0)+'%':'—'}</span></div>`).join("")}
function renderV66EdgeValidation(persist=false){const x=v66EdgeValidationSuite(persist),cls=x.hardBlock?"bad":x.score>=75?"good":"neutral",summary=`${x.market} · ${x.source} · ${x.symbol||'—'} · ${x.tf||'—'} · ${x.outcome.state} · DNA ${x.dna.state}`;for(const id of ["v66DashState","v66DecisionState"]){if($(id)){$(id).textContent=x.state;$(id).className="edgeCalState "+cls}}for(const id of ["v66DashSummary","v66DecisionSummary"])if($(id))$(id).textContent=summary;for(const id of ["v66DashQuality","v66DecisionQuality"])if($(id))$(id).textContent=x.quality.score+"/100";for(const id of ["v66DashEce","v66DecisionEce"])if($(id))$(id).textContent=Number.isFinite(x.calibration.ece)?x.calibration.ece.toFixed(1)+" pp":"—";for(const id of ["v66DashDecay","v66DecisionDecay"])if($(id)){$(id).textContent=x.decay.state;$(id).className=x.decay.state==="SEVERE"?"bad":x.decay.state==="STABLE"?"good":"neutral"}for(const id of ["v66DashSuff","v66DecisionSuff"])if($(id))$(id).textContent=`${x.sufficiency.state} · ${x.sufficiency.score}/100`;const tools=x.modules.map(v66ToolHtml).join("");if($("v66DashGrid"))$("v66DashGrid").innerHTML=tools;if($("v66DecisionGrid"))$("v66DecisionGrid").innerHTML=tools;const cal=v66CalibrationMarkup(x.calibration),con=v66ContributionMarkup(x.contribution,x.ablation),lay=v66LayersMarkup(x.layers);for(const id of ["v66DashCalibration","v66DecisionCalibration"])if($(id))$(id).innerHTML=cal;for(const id of ["v66DashContrib","v66DecisionContrib"])if($(id))$(id).innerHTML=con;for(const id of ["v66DashLayers","v66DecisionLayers"])if($(id))$(id).innerHTML=lay;if($("masterEdgeV66")){$("masterEdgeV66").textContent=`${x.state} · ${x.quality.score}/100`;$("masterEdgeV66").className=x.hardBlock?"bad":x.quality.score>=75?"good":"neutral"}if($("masterDnaV66")){$("masterDnaV66").textContent=`${x.dna.state} · N${x.dna.current?.n||0}`;$("masterDnaV66").className=x.dna.state==="BLACKLIST"?"bad":x.dna.state==="WHITELIST"?"good":"neutral"}if($("masterSuffV66"))$("masterSuffV66").textContent=`${x.sufficiency.state} · ${x.sufficiency.score}/100`;return x}
async function refreshV66EdgeValidation(force=false){if(force){await evaluateResearchJournalSilent(40).catch(()=>{});await v66LoadReplayStats();}else if(!window.__v66ReplayStats)v66LoadReplayStats().then(()=>renderV66EdgeValidation(false)).catch(()=>{});const x=renderV66EdgeValidation(true);if(force&&window.__radarState)renderMasterVerdict();return x}


// v67 · Production Trading Operations Pro
const V67_OPS_KEY="opsControlV67",V67_INCIDENT_KEY="opsIncidentsV67",V67_LEDGER_KEY="opsSignalLedgerV67",V67_RECOVERY_KEY="opsRecoveryV67";
let v67OpsTimer=null,v67OpsInitialized=false,v67LastState="BOOTING",v67LastReconcile=null;
function v67Now(){return Date.now()}
function v67OpsSettings(){return {...{watchdogMs:30000,heartbeatStaleMs:90000,wsStaleMs:60000,providerStaleMs:20*60000,duplicateWindowMs:15*60000},...v60StoreGet(V67_OPS_KEY,{})}}
function v67SignalFingerprintFrom(x){const round=n=>Number.isFinite(+n)?(+n).toPrecision(8):"NA";return [x.market||"?",x.source||"?",String(x.symbol||"").toUpperCase(),x.tf||"?",x.direction||"?",round(x.entry),round(x.stop)].join("|")}
function v67DedupCheck(ledger,fingerprint,now=v67Now(),windowMs=15*60000,activeFingerprints=[]){const recent=(ledger||[]).filter(x=>x&&x.fp===fingerprint&&now-(+x.ts||0)<=windowMs),active=(activeFingerprints||[]).includes(fingerprint);return {blocked:active||recent.length>0,active,recent:recent.length,reason:active?"ACTIVE_DUPLICATE":recent.length?"COOLDOWN_DUPLICATE":"CLEAR"}}
function v67ReconcileArrays(paper=[],shadow=[]){const dedupe=a=>{const seen=new Set(),out=[],dups=[];for(const x of a||[]){const id=String(x?.id??"");if(!id||seen.has(id)){dups.push(x);continue}seen.add(id);out.push(x)}return {out,dups}};const p=dedupe(paper),s=dedupe(shadow),paperFp=[],shadowFp=[];for(const x of p.out){if(typeof paperOrderActive==="function"?paperOrderActive(x):!["CLOSED","CANCELLED","STOP","TP3","TIME STOP"].includes(x?.status))paperFp.push(v67SignalFingerprintFrom({market:x.market,source:x.source,symbol:x.symbol,tf:x.tf,direction:x.direction,entry:x.plannedEntry??x.entry,stop:x.stop}))}for(const x of s.out)if(x?.status==="ACTIVE")shadowFp.push(v67SignalFingerprintFrom({market:x.market,source:x.source,symbol:x.symbol,tf:x.tf,direction:x.direction,entry:x.plannedEntry??x.actualEntry,stop:x.stop}));const activeDup=(paperFp.length-new Set(paperFp).size)+(shadowFp.length-new Set(shadowFp).size);return {paper:p.out,shadow:s.out,paperDupIds:p.dups.length,shadowDupIds:s.dups.length,activeDuplicateFingerprints:Math.max(0,activeDup),changed:p.dups.length+s.dups.length>0}}
function v67OpsScore(checks=[]){let score=100,hard=false,warn=false,reasons=[];for(const c of checks){if(c.ok)continue;const sev=c.severity||"WARN",pen=Number.isFinite(+c.penalty)?+c.penalty:(sev==="HARD"?40:15);score-=pen;reasons.push(c.label||c.code||"Operational issue");if(sev==="HARD")hard=true;else warn=true}score=Math.max(0,Math.min(100,score));const state=hard?(score<25?"EMERGENCY":"SAFE MODE"):warn||score<85?"DEGRADED":"NORMAL";return {score:Math.round(score),state,hardBlock:hard,reasons}}
function v67Incident(severity,code,message,data=null){const now=v67Now(),a=v60StoreGet(V67_INCIDENT_KEY,[]),last=a[0];if(last&&last.code===code&&last.message===message&&now-(+last.ts||0)<60000)return last;const row={id:`${now}-${code}`,ts:now,severity,code,message,data,ack:false};a.unshift(row);v60StoreSet(V67_INCIDENT_KEY,a.slice(0,200));if(localDbSupported()&&!appSettings().privacySessionOnly)localDbPutRecord("ops_incidents_v67",row.id,row,row.ts).catch(()=>{});return row}
function v67Incidents(){return v60StoreGet(V67_INCIDENT_KEY,[])}
function v67ManualState(){return v60StoreGet(V67_OPS_KEY,{}).manualPause||false}
function v67EmergencyPause(reason="MANUAL PAUSE"){const x=v67OpsSettings();x.manualPause=true;x.pauseReason=reason;x.pauseTs=v67Now();v60StoreSet(V67_OPS_KEY,x);v67Incident("HARD","MANUAL_PAUSE",reason);refreshV67Operations(true);toast("Operations paused · new Paper/Shadow entries blocked","bad");return true}
function v67ResumeOperations(){if(typeof confirm==="function"&&!confirm("Resume new Paper/Shadow entries? Existing risk and Kill Switch gates still apply."))return false;const x=v67OpsSettings();x.manualPause=false;x.pauseReason="";x.resumeTs=v67Now();v60StoreSet(V67_OPS_KEY,x);v67Incident("INFO","MANUAL_RESUME","Operations manually resumed");refreshV67Operations(true);toast("Operations resumed · normal risk gates still apply","good");return true}
function v67FlattenAndPause(){v67EmergencyPause("FLATTEN + MANUAL PAUSE");if(typeof paperFlattenAll==="function")paperFlattenAll();return true}
function v67ActiveFingerprints(kind){const out=[];if(kind!=="SHADOW")for(const x of paperTrades()){paperMigrateTrade(x);if(paperOrderActive(x))out.push(v67SignalFingerprintFrom({market:x.market,source:x.source,symbol:x.symbol,tf:x.tf,direction:x.direction,entry:x.plannedEntry??x.entry,stop:x.stop}))}if(kind!=="PAPER")for(const x of shadowTradesV60())if(x?.status==="ACTIVE")out.push(v67SignalFingerprintFrom({market:x.market,source:x.source,symbol:x.symbol,tf:x.tf,direction:x.direction,entry:x.plannedEntry??x.actualEntry,stop:x.stop}));return out}
function v67CurrentFingerprint(direction){const st=window.__radarState,ss=window.__signalState;if(!st||!ss)return "";return v67SignalFingerprintFrom({market:assetClass(),source:st.source||analysisSource(),symbol:st.symbol,tf:st.tf,direction:direction||ss.tm?.direction,entry:ss.tm?((+ss.tm.entryLow+ +ss.tm.entryHigh)/2):NaN,stop:ss.tm?.stop})}
function v67DuplicateSignalGate(kind,direction){const fp=v67CurrentFingerprint(direction);if(!fp)return {blocked:false,reason:"NO_CONTEXT",fp:""};const cfg=v67OpsSettings(),ledger=v60StoreGet(V67_LEDGER_KEY,[]).filter(x=>!x?.kind||x.kind===kind),d=v67DedupCheck(ledger,fp,v67Now(),cfg.duplicateWindowMs,v67ActiveFingerprints(kind));return {...d,fp,kind}}
function v67MarkSignal(kind,fp){if(!fp)return;const now=v67Now(),cfg=v67OpsSettings(),a=v60StoreGet(V67_LEDGER_KEY,[]).filter(x=>now-(+x.ts||0)<=Math.max(cfg.duplicateWindowMs*8,86400000));a.unshift({ts:now,kind,fp});v60StoreSet(V67_LEDGER_KEY,a.slice(0,300))}
function v67RecoverySnapshot(){const snap={ts:v67Now(),bootId:window.__v67BootId||"",paper:paperTrades().filter(x=>{paperMigrateTrade(x);return paperOrderActive(x)}).map(x=>({id:x.id,status:x.status,symbol:x.symbol,tf:x.tf,direction:x.direction,lastProcessedBarTs:x.lastProcessedBarTs||0})),shadow:shadowTradesV60().filter(x=>x.status==="ACTIVE").map(x=>({id:x.id,status:x.status,symbol:x.symbol,tf:x.tf,direction:x.direction,lastProcessedTs:x.lastProcessedTs||0})),master:window.__masterVerdict?{verdict:window.__masterVerdict.verdict,ts:window.__masterVerdict.ts}:null};v60StoreSet(V67_RECOVERY_KEY,snap);return snap}
function v67RunReconcile(fix=true){const p=paperTrades(),s=shadowTradesV60(),r=v67ReconcileArrays(p,s);if(fix&&r.changed){setPaperTrades(r.paper);setShadowTradesV60(r.shadow);v67Incident("WARN","STATE_RECONCILED",`Removed duplicate IDs · Paper ${r.paperDupIds} · Shadow ${r.shadowDupIds}`,r)}if(r.activeDuplicateFingerprints>0)v67Incident("HARD","ACTIVE_DUPLICATE_SIGNAL",`${r.activeDuplicateFingerprints} duplicate active Paper fingerprints detected`,r);v67LastReconcile={ts:v67Now(),...r};renderV67Operations(false);return v67LastReconcile}
function v67HeartbeatAge(ts){return Number.isFinite(+ts)?Math.max(0,v67Now()-+ts):Infinity}
function v67OperationsSnapshot(persist=false){const now=v67Now(),cfg=v67OpsSettings(),prior=v60StoreGet("opsHeartbeatV67",null),provider=window.__providerHealthV62||null,rec=v67LastReconcile||v67ReconcileArrays(paperTrades(),shadowTradesV60()),kill=window.__decisionIntelV65?.killSwitch||null,online=typeof navigator==="undefined"?true:navigator.onLine!==false,crypto=typeof assetClass==="function"&&assetClass()==="CRYPTO",wsRequired=crypto&&!!window.__radarState,lastTick=typeof lastWsTick!=="undefined"?+lastWsTick||0:0,checks=[];
 const add=(code,ok,severity,label,penalty)=>checks.push({code,ok:!!ok,severity,label,penalty});add("MANUAL",!v67ManualState(),"HARD",v67OpsSettings().pauseReason||"Manual operations pause",55);add("ONLINE",online,"HARD","Browser/network offline",45);add("WS",!wsRequired||!lastTick||now-lastTick<=cfg.wsStaleMs,"WARN","Live websocket stale",15);add("PROVIDER",!provider||provider.state==="NEÎNCERCAT"||((+provider.score||0)>=75&&now-(+provider.ts||now)<=cfg.providerStaleMs),provider&&provider.state!=="NEÎNCERCAT"&&(+provider.score||0)<50?"HARD":"WARN",provider?.state==="NEÎNCERCAT"?"Provider health NEÎNCERCAT (nicio analiză încă)":provider?`Provider health ${(+provider.score||0).toFixed(0)}/100 or stale`:"Provider health not checked",provider&&provider.state!=="NEÎNCERCAT"?25:8);add("KILL",!kill||kill.state!=="NO NEW TRADES","HARD","Capital Preservation kill switch active",50);add("DUP",(+rec.activeDuplicateFingerprints||0)===0,"HARD","Duplicate active signal state",50);add("IDB",localDbSupported(),"WARN","IndexedDB unavailable",8);
 const scored=v67OpsScore(checks),hb={ts:now,bootId:window.__v67BootId||"",state:scored.state,score:scored.score,paperActive:paperTrades().filter(x=>{paperMigrateTrade(x);return paperOrderActive(x)}).length,shadowActive:shadowTradesV60().filter(x=>x.status==="ACTIVE").length};const recovery=v60StoreGet("opsRecoveryStatusV67",{state:"CLEAN",detail:"No recovery action required."}),out={...scored,ts:now,checks,heartbeat:hb,priorHeartbeat:prior,recovery,reconcile:rec,manualPause:v67ManualState(),incidentCount:v67Incidents().filter(x=>!x.ack).length};window.__opsV67=out;if(persist){v60StoreSet("opsHeartbeatV67",hb);v67RecoverySnapshot();if(localDbSupported()&&!appSettings().privacySessionOnly)localDbPutRecord("ops_heartbeat_v67",String(Math.floor(now/60000)),out,now).catch(()=>{})}return out}
function v67EntryAllowed(kind,direction){const ops=v67OperationsSnapshot(false);if(ops.hardBlock){toast(`${kind} blocked by Operations v67 · ${ops.state}: ${ops.reasons[0]||"unsafe runtime"}`,"bad");return false}const d=v67DuplicateSignalGate(kind,direction);if(d.blocked){v67Incident("WARN","DUPLICATE_SIGNAL_BLOCK",`${kind} duplicate blocked · ${d.reason}`,{fp:d.fp});toast(`${kind} duplicate blocked · ${d.reason}`,"warn");return false}return true}
function v67RecoverAfterRestart(){const prev=v60StoreGet(V67_RECOVERY_KEY,null),now=v67Now();let status={state:"CLEAN",detail:"No prior active simulation state."};if(prev&&(prev.paper?.length||prev.shadow?.length)){const age=now-(+prev.ts||0);status={state:age<24*3600000?"RECONCILED":"STALE SNAPSHOT",detail:`Prior snapshot age ${Math.round(age/1000)}s · Paper ${prev.paper?.length||0} · Shadow ${prev.shadow?.length||0}`};const r=v67RunReconcile(true);status.reconcile=r;if(age<24*3600000&&typeof navigator!=="undefined"&&navigator.onLine!==false){setTimeout(()=>{refreshPaper().catch(()=>{});refreshShadowLive(true).catch(()=>{})},1200)}v67Incident("WARN","RESTART_RECOVERY",status.detail,status)}v60StoreSet("opsRecoveryStatusV67",status);return status}
function v67OpsToolHtml(c){const state=c.ok?"OK":c.severity==="HARD"?"BLOCK":"WARN",cls=c.ok?"good":c.severity==="HARD"?"bad":"warn";return `<div class="decisionTool ${cls}"><div class="decisionToolHead"><b>${escapeHtml(c.code)}</b><span class="decisionToolState">${state}</span></div><div class="decisionToolDetail">${escapeHtml(c.ok?"Operational check passed.":c.label||"Issue")}</div><div class="decisionToolAction">${c.ok?"No action required.":c.severity==="HARD"?"New Paper/Shadow entries blocked until cleared.":"Monitor / refresh before sizing up."}</div></div>`}
function v67IncidentMarkup(rows){return rows.length?`<div class="edgeCalRow head"><span>Time</span><span>Severity</span><span>Code</span><span>Message</span></div>`+rows.slice(0,12).map(x=>`<div class="edgeCalRow ${x.severity==="HARD"?"bad":x.severity==="WARN"?"warn":""}"><span>${new Date(+x.ts||0).toLocaleTimeString()}</span><b>${escapeHtml(x.severity)}</b><span>${escapeHtml(x.code)}</span><span>${escapeHtml(x.message)}</span></div>`).join(""):`<div class="emptyState">No operations incidents.</div>`}
function renderV67Operations(persist=false){const x=v67OperationsSnapshot(persist),has=!!window.__radarState,cls=x.hardBlock?"bad":x.state==="DEGRADED"?"neutral":"good",hbAge=x.priorHeartbeat?Math.round(v67HeartbeatAge(x.priorHeartbeat.ts)/1000):0,summary=`${x.state} · ${x.reasons.length?x.reasons.join(" · "):"runtime checks clear"}`;for(const id of ["v67DashState","v67DecisionState"]){if($(id)){$(id).textContent=x.state;$(id).className="decisionOsState "+cls}}for(const id of ["v67DashSummary","v67DecisionSummary"])if($(id))$(id).textContent=summary;for(const id of ["v67DashScore","v67DecisionScore","v67HealthScore"])if($(id))$(id).textContent=`${x.score}/100`;for(const id of ["v67DashHeartbeat","v67DecisionHeartbeat","v67HealthHeartbeat"])if($(id))$(id).textContent=x.priorHeartbeat?`${hbAge}s ago`:`NEW`;for(const id of ["v67DashRecovery","v67DecisionRecovery","v67HealthRecovery"])if($(id))$(id).textContent=x.recovery?.state||"CLEAN";for(const id of ["v67DashIncidents","v67DecisionIncidents"])if($(id))$(id).textContent=x.incidentCount;if($("v67HealthWatchdog"))$("v67HealthWatchdog").textContent=x.state;if($("v67HealthStatus"))$("v67HealthStatus").textContent=`${x.state} · ${x.score}/100 · ${new Date(x.ts).toLocaleTimeString()}`;const tools=x.checks.map(v67OpsToolHtml).join("");if($("v67DashGrid"))$("v67DashGrid").innerHTML=tools;if($("v67DecisionGrid"))$("v67DecisionGrid").innerHTML=tools;if($("v67HealthTable"))$("v67HealthTable").innerHTML=tools;if($("v67DecisionIncidentsTable"))$("v67DecisionIncidentsTable").innerHTML=v67IncidentMarkup(v67Incidents());if($("v67IncidentTable"))$("v67IncidentTable").innerHTML=v67IncidentMarkup(v67Incidents());if($("v67DecisionReconcile")){const r=x.reconcile||{};$("v67DecisionReconcile").innerHTML=`<div class="edgeCalRow"><span>Paper duplicate IDs</span><b>${r.paperDupIds||0}</b><span>Shadow duplicate IDs</span><b>${r.shadowDupIds||0}</b></div><div class="edgeCalRow"><span>Active duplicate fingerprints</span><b>${r.activeDuplicateFingerprints||0}</b><span>Last reconcile</span><b>${v67LastReconcile?new Date(v67LastReconcile.ts).toLocaleTimeString():"—"}</b></div>`}if($("masterOpsV67")){$("masterOpsV67").textContent=`${x.state} · ${x.score}/100`;$ ("masterOpsV67").className=x.hardBlock?"bad":x.state==="DEGRADED"?"neutral":"good"}return x}
function refreshV67Operations(persist=true){const prev=v67LastState,x=renderV67Operations(persist);v67LastState=x.state;if(prev!=="BOOTING"&&prev!==x.state){const sev=x.hardBlock?"HARD":x.state==="DEGRADED"?"WARN":"INFO";v67Incident(sev,"OPS_STATE_CHANGE",`${prev} → ${x.state}`,{score:x.score,reasons:x.reasons});if(typeof addAlert==="function"&&x.state!=="NORMAL")addAlert("ops-v67",`Operations ${x.state}`,x.reasons.join(" · ")||`Score ${x.score}/100`,x.hardBlock?"bad":"warn")}return x}
function initV67Operations(){if(v67OpsInitialized)return;v67OpsInitialized=true;window.__v67BootId=`${v67Now()}-${Math.random().toString(36).slice(2,8)}`;v67RecoverAfterRestart();refreshV67Operations(true);const cfg=v67OpsSettings();v67OpsTimer=setInterval(()=>refreshV67Operations(true),Math.max(10000,+cfg.watchdogMs||30000));if(typeof window!=="undefined"){window.addEventListener("online",()=>refreshV67Operations(true));window.addEventListener("offline",()=>{v67Incident("HARD","NETWORK_OFFLINE","Browser reported offline");refreshV67Operations(true)});window.addEventListener("pagehide",()=>{v67RecoverySnapshot();const hb=v60StoreGet("opsHeartbeatV67",{});hb.cleanPagehideTs=v67Now();v60StoreSet("opsHeartbeatV67",hb)});document?.addEventListener?.("visibilitychange",()=>{if(document.visibilityState==="visible")refreshV67Operations(true)})}}

// Boot only after every versioned module and its lexical state are initialized.
applyNetworkState();restoreObservedLiquidations();restoreActiveModelVersion();restoreMetaEnsembleV2();renderSettings();renderApiAuthStatus();tbColectorPornit();renderAlerts();renderPaper();renderFreshness();renderValidation();renderForwardLab();renderProfitReadiness(false);renderReplayLab();renderEdgePro();renderV65DecisionOS(false);renderV66EdgeValidation(false);initV67Operations();if(typeof initV71PionexJournal==="function")initV71PionexJournal();renderPushStatus().catch(()=>{});renderDailyDesk();renderModelVersions();renderObservedLiquidationHeatmap();initLocalDataLayer().then(()=>{refreshV66EdgeValidation(false);refreshV67Operations(false)}).catch(()=>{});
