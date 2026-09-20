const ENGINE_CONTRACT_VERSION="54.1";
const PIONEX="https://api.pionex.com";
const TD="https://api.twelvedata.com";
const ENC=new TextEncoder();

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const clamp=(v,a=0,b=100)=>Math.max(a,Math.min(b,v));
const safeNum=v=>Number.isFinite(Number(v))?Number(v):null;
const text=(v,n=120)=>String(v??"").slice(0,n);
const json=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:{"content-type":"application/json","cache-control":"no-store"}});

function b64uToBytes(s){
  const x=String(s||"").replace(/-/g,"+").replace(/_/g,"/"),pad="=".repeat((4-x.length%4)%4),bin=atob(x+pad);
  return Uint8Array.from(bin,c=>c.charCodeAt(0));
}
function bytesToB64u(bytes){
  let bin="";for(const b of bytes)bin+=String.fromCharCode(b);
  return btoa(bin).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
function concat(...arrs){
  const n=arrs.reduce((a,b)=>a+b.length,0),out=new Uint8Array(n);let o=0;
  for(const a of arrs){out.set(a,o);o+=a.length}return out
}
function u32be(n){const a=new Uint8Array(4);new DataView(a.buffer).setUint32(0,n,false);return a}

async function hmac(keyBytes,data){
  const k=await crypto.subtle.importKey("raw",keyBytes,{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC",k,data));
}
async function hkdfExtract(salt,ikm){return hmac(salt,ikm)}
async function hkdfExpand(prk,info,len){
  let out=new Uint8Array(0),prev=new Uint8Array(0),i=1;
  while(out.length<len){prev=await hmac(prk,concat(prev,info,Uint8Array.of(i++)));out=concat(out,prev)}
  return out.slice(0,len)
}
async function vapidJwt(endpoint,env){
  const pub=b64uToBytes(env.VAPID_PUBLIC_KEY),priv=b64uToBytes(env.VAPID_PRIVATE_KEY);
  if(pub.length!==65||pub[0]!==4||priv.length!==32)throw Error("Invalid VAPID key format");
  const x=bytesToB64u(pub.slice(1,33)),y=bytesToB64u(pub.slice(33,65)),d=bytesToB64u(priv);
  const key=await crypto.subtle.importKey("jwk",{kty:"EC",crv:"P-256",x,y,d,ext:true,key_ops:["sign"]},{name:"ECDSA",namedCurve:"P-256"},false,["sign"]);
  const header=bytesToB64u(ENC.encode(JSON.stringify({typ:"JWT",alg:"ES256"}))),payload=bytesToB64u(ENC.encode(JSON.stringify({aud:new URL(endpoint).origin,exp:Math.floor(Date.now()/1000)+12*3600,sub:env.VAPID_SUBJECT}))),input=ENC.encode(header+"."+payload);
  const sig=new Uint8Array(await crypto.subtle.sign({name:"ECDSA",hash:"SHA-256"},key,input));
  return header+"."+payload+"."+bytesToB64u(sig)
}
async function encryptWebPush(subscription,payload){
  const userPub=b64uToBytes(subscription.keys.p256dh),auth=b64uToBytes(subscription.keys.auth);
  const clientKey=await crypto.subtle.importKey("raw",userPub,{name:"ECDH",namedCurve:"P-256"},false,[]);
  const serverKeys=await crypto.subtle.generateKey({name:"ECDH",namedCurve:"P-256"},true,["deriveBits"]);
  const shared=new Uint8Array(await crypto.subtle.deriveBits({name:"ECDH",public:clientKey},serverKeys.privateKey,256)),serverPub=new Uint8Array(await crypto.subtle.exportKey("raw",serverKeys.publicKey));
  const prkKey=await hkdfExtract(auth,shared),keyInfo=concat(ENC.encode("WebPush: info\0"),userPub,serverPub),ikm=await hkdfExpand(prkKey,keyInfo,32),salt=crypto.getRandomValues(new Uint8Array(16)),prk=await hkdfExtract(salt,ikm);
  const cek=await hkdfExpand(prk,ENC.encode("Content-Encoding: aes128gcm\0"),16),nonce=await hkdfExpand(prk,ENC.encode("Content-Encoding: nonce\0"),12),plain=concat(ENC.encode(payload),Uint8Array.of(2));
  const aes=await crypto.subtle.importKey("raw",cek,{name:"AES-GCM"},false,["encrypt"]),cipher=new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv:nonce,tagLength:128},aes,plain));
  return concat(salt,u32be(4096),Uint8Array.of(serverPub.length),serverPub,cipher)
}
async function sendWebPush(subscription,payload,env){
  const jwt=await vapidJwt(subscription.endpoint,env),body=await encryptWebPush(subscription,JSON.stringify(payload));
  return fetch(subscription.endpoint,{method:"POST",headers:{
    "TTL":"120","Urgency":"normal","Content-Encoding":"aes128gcm","Content-Type":"application/octet-stream",
    "Authorization":`vapid t=${jwt}, k=${env.VAPID_PUBLIC_KEY}`
  },body})
}
function pushConfigured(env){return !!(env.PUSH_SUBSCRIPTIONS&&env.VAPID_PUBLIC_KEY&&env.VAPID_PRIVATE_KEY&&env.VAPID_SUBJECT)}
async function broadcastPush(env,payload){
  if(!pushConfigured(env))return {configured:false,sent:0,failed:0};
  let cursor=undefined,sent=0,failed=0,stale=[],processed=0;const cap=Math.max(1,Math.min(5000,Number(env.MAX_PUSH_RECIPIENTS)||1000)),concurrency=20;
  do{
    const page=await env.PUSH_SUBSCRIPTIONS.list({limit:Math.min(500,cap-processed),cursor}),keys=page.keys||[];cursor=page.list_complete?undefined:page.cursor;
    const vals=await Promise.all(keys.map(async k=>({key:k.name,val:await env.PUSH_SUBSCRIPTIONS.get(k.name,"json")})));processed+=vals.length;
    for(let i=0;i<vals.length;i+=concurrency){const batch=vals.slice(i,i+concurrency),out=await Promise.all(batch.map(async x=>{const sub=x.val?.subscription;if(!sub?.endpoint)return {skip:true};try{const r=await sendWebPush(sub,payload,env);return {ok:r.ok,status:r.status,key:x.key}}catch{return {ok:false,status:0,key:x.key}}}));for(const r of out){if(r.skip)continue;if(r.ok)sent++;else{failed++;if(r.status===404||r.status===410)stale.push(r.key)}}}
    if(processed>=cap)cursor=undefined;
  }while(cursor);
  for(let i=0;i<stale.length;i+=50)await Promise.all(stale.slice(i,i+50).map(k=>env.PUSH_SUBSCRIPTIONS.delete(k).catch(()=>{})));
  return {configured:true,sent,failed,stale:stale.length,processed,capped:processed>=cap}
}

async function ensureTables(db){
  await db.exec(`
CREATE TABLE IF NOT EXISTS monitor_runs (id INTEGER PRIMARY KEY AUTOINCREMENT,tenant TEXT NOT NULL DEFAULT 'monitor',ts INTEGER NOT NULL,market TEXT NOT NULL,provider TEXT NOT NULL,mode TEXT,universe_n INTEGER DEFAULT 0,processed_n INTEGER DEFAULT 0,status TEXT NOT NULL,top_symbol TEXT,top_score REAL,note TEXT);
CREATE TABLE IF NOT EXISTS monitor_items (id INTEGER PRIMARY KEY AUTOINCREMENT,run_id INTEGER NOT NULL,rank INTEGER NOT NULL,market TEXT NOT NULL,symbol TEXT NOT NULL,source TEXT,bias TEXT,score REAL,confidence REAL,adx REAL,rsi REAL,regime TEXT,price REAL,change_pct REAL,turnover REAL,payload_json TEXT);
CREATE TABLE IF NOT EXISTS monitor_state (key TEXT PRIMARY KEY,value TEXT,updated_ts INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS app_events (id INTEGER PRIMARY KEY AUTOINCREMENT,tenant TEXT NOT NULL DEFAULT 'monitor',ts INTEGER NOT NULL,type TEXT NOT NULL,market TEXT,symbol TEXT,source TEXT,severity TEXT,title TEXT,message TEXT,payload_json TEXT);
CREATE INDEX IF NOT EXISTS idx_monitor_runs_market_ts ON monitor_runs(market,ts DESC);
CREATE INDEX IF NOT EXISTS idx_monitor_items_run_rank ON monitor_items(run_id,rank);
`)
}
async function stateGet(db,key){
  try{const x=await db.prepare("SELECT value,updated_ts FROM monitor_state WHERE key=?").bind(key).first();return x?{value:x.value,updatedTs:+x.updated_ts}:null}catch{return null}
}
async function statePut(db,key,value){
  await db.prepare(`INSERT INTO monitor_state(key,value,updated_ts) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_ts=excluded.updated_ts`).bind(key,String(value),Date.now()).run()
}
async function writeRun(env,market,provider,universeN,items,status="OK",note=""){
  const top=items[0]||null,run=await env.DB.prepare(`INSERT INTO monitor_runs(ts,market,provider,mode,universe_n,processed_n,status,top_symbol,top_score,note) VALUES(?,?,?,?,?,?,?,?,?,?)`)
    .bind(Date.now(),market,provider,"SERVER-LITE",universeN,items.length,status,top?.symbol||null,top?.score??null,text(note,500)||null).run(),runId=run.meta?.last_row_id;
  if(runId&&items.length){
    const stmts=items.slice(0,120).map((x,i)=>env.DB.prepare(`INSERT INTO monitor_items(run_id,rank,market,symbol,source,bias,score,confidence,adx,rsi,regime,price,change_pct,turnover,payload_json) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(runId,i+1,market,x.symbol,provider,x.bias,x.score,x.confidence,x.adx,x.rsi,x.regime,x.price,x.changePct,x.turnover,JSON.stringify(x)));
    for(let i=0;i<stmts.length;i+=40)await env.DB.batch(stmts.slice(i,i+40))
  }
  return {runId,top}
}
async function recordEvent(env,type,market,title,message,payload){
  try{await env.DB.prepare(`INSERT INTO app_events(ts,type,market,source,severity,title,message,payload_json) VALUES(?,?,?,?,?,?,?,?)`).bind(Date.now(),type,market,"CLOUD_MONITOR","INFO",title,message,JSON.stringify(payload||{})).run()}catch{}
}

async function applyRetention(env){
  if(!env.DB)return;const days=Math.max(7,Math.min(365,Number(env.RETENTION_DAYS)||90)),cut=Date.now()-days*86400000;
  try{await env.DB.batch([env.DB.prepare("DELETE FROM monitor_items WHERE run_id IN (SELECT id FROM monitor_runs WHERE ts < ?)").bind(cut),env.DB.prepare("DELETE FROM monitor_runs WHERE ts < ?").bind(cut),env.DB.prepare("DELETE FROM app_events WHERE ts < ?").bind(cut)]);for(const table of ["research_snapshots","signal_snapshots"]){try{await env.DB.prepare(`DELETE FROM ${table} WHERE ts < ?`).bind(cut).run()}catch{}}await statePut(env.DB,"last_retention",JSON.stringify({ts:Date.now(),days,cut}))}catch{}
}
async function pionexGlobalGate(env){
  if(!env.DB){await sleep(1300);return}const key="pionex_global_next_at",prior=await stateGet(env.DB,key),now=Date.now(),next=Number(prior?.value||0);if(next>now)await sleep(Math.min(5000,next-now));await statePut(env.DB,key,String(Date.now()+1300))
}
async function fetchJson(url,opt={}){
  const r=await fetch(url,{...opt,headers:{"accept":"application/json",...(opt.headers||{})}}),raw=await r.text();let d;try{d=JSON.parse(raw)}catch{throw Error(`Invalid JSON · HTTP ${r.status}`)}
  if(!r.ok){const e=Error(d?.message||d?.msg||`HTTP ${r.status}`);e.status=r.status;e.retryAfter=Number(r.headers.get("retry-after")||0);throw e}
  if(d?.result===false||d?.status==="error"){const e=Error(d.message||d.error||"Provider error");e.status=Number(d.code)||502;throw e}
  return d
}
function emaLast(a,n){
  if(!a.length)return NaN;const k=2/(n+1);let e=a[0];for(let i=1;i<a.length;i++)e=a[i]*k+e*(1-k);return e
}
function rsiLast(c,n=14){
  if(c.length<n+1)return 50;let g=0,l=0;for(let i=c.length-n;i<c.length;i++){const d=c[i]-c[i-1];if(d>=0)g+=d;else l-=d}const ag=g/n,al=l/n;if(!al)return 100;return 100-100/(1+ag/al)
}
function atrLast(rows,n=14){
  if(rows.length<n+1)return 0;let s=0;for(let i=rows.length-n;i<rows.length;i++){const h=+rows[i][2],l=+rows[i][3],pc=+rows[i-1][4];s+=Math.max(h-l,Math.abs(h-pc),Math.abs(l-pc))}return s/n
}
function adxLast(rows,n=14){
  if(rows.length<2*n+2)return 0;let trs=[],pdm=[],mdm=[];
  for(let i=1;i<rows.length;i++){const h=+rows[i][2],l=+rows[i][3],ph=+rows[i-1][2],pl=+rows[i-1][3],pc=+rows[i-1][4],up=h-ph,down=pl-l;trs.push(Math.max(h-l,Math.abs(h-pc),Math.abs(l-pc)));pdm.push(up>down&&up>0?up:0);mdm.push(down>up&&down>0?down:0)}
  const dx=[];for(let i=n-1;i<trs.length;i++){let tr=0,p=0,m=0;for(let k=i-n+1;k<=i;k++){tr+=trs[k];p+=pdm[k];m+=mdm[k]}if(!tr){dx.push(0);continue}const pdi=100*p/tr,mdi=100*m/tr;dx.push(pdi+mdi?100*Math.abs(pdi-mdi)/(pdi+mdi):0)}
  return dx.length?n>dx.length?dx.reduce((a,b)=>a+b,0)/dx.length:dx.slice(-n).reduce((a,b)=>a+b,0)/n:0
}
function scoreRows(rows,turnover=0,changePct=0,symbol=""){
  if(rows.length<60)return null;const c=rows.map(x=>+x[4]),v=rows.map(x=>+x[5]),last=c.at(-1),e20=emaLast(c.slice(-80),20),e50=emaLast(c.slice(-120),50),rsi=rsiLast(c),atr=atrLast(rows),adx=adxLast(rows),avgVol=v.slice(-21,-1).reduce((a,b)=>a+b,0)/20,vr=avgVol?v.at(-1)/avgVol:1,priorHigh=Math.max(...rows.slice(-21,-1).map(x=>+x[2])),priorLow=Math.min(...rows.slice(-21,-1).map(x=>+x[3]));
  let raw=50;raw+=e20>e50?15:-15;raw+=last>e20?8:-8;raw+=rsi>=55&&rsi<=72?10:rsi<=45&&rsi>=28?-10:rsi>78?-5:rsi<22?5:0;if(adx>=25)raw+=e20>e50?7:-7;if(vr>=1.3)raw+=last>+rows.at(-2)[4]?6:-6;if(last>priorHigh)raw+=8;if(last<priorLow)raw-=8;raw=clamp(raw);
  const strength=clamp(Math.abs(raw-50)*2),bias=raw>=58?"BULLISH":raw<=42?"BEARISH":"NEUTRAL",atrPct=last?atr/last*100:0,regime=adx>=25?(bias==="BULLISH"?"TREND BULL":bias==="BEARISH"?"TREND BEAR":"TREND"):(atrPct>=3?"VOLATILE RANGE":"RANGE");
  return {symbol,bias,score:strength,rawScore:raw,confidence:strength,adx,rsi,regime,price:last,changePct,turnover,atrPct,volumeRatio:vr}
}

function excludedBase(base){
  return ["USDT","USDC","FDUSD","TUSD","USDP","DAI","USDE","PYUSD"].includes(base)||/(3L|3S|5L|5S|BULL|BEAR)$/.test(base)
}
async function pionexUniverse(env,limit=20){
  await pionexGlobalGate(env);const d=await fetchJson(`${PIONEX}/api/v1/market/tickers?type=SPOT`),rows=d?.data?.tickers||[];
  return rows.map(x=>{const symbol=String(x.symbol||""),m=symbol.match(/^(.+)_USDT$/);return m?{symbol,base:m[1],turnover:+x.amount||0,changePct:(+x.open)?((+x.close/+x.open)-1)*100:0}:null})
    .filter(x=>x&&!excludedBase(x.base)&&x.turnover>0).sort((a,b)=>b.turnover-a.turnover).slice(0,limit)
}
async function pionexKlines(env,symbol){
  await pionexGlobalGate(env);const d=await fetchJson(`${PIONEX}/api/v1/market/klines?symbol=${encodeURIComponent(symbol)}&interval=4H&limit=140`),rows=d?.data?.klines||[];
  return rows.map(x=>[+x.time,String(x.open),String(x.high),String(x.low),String(x.close),String(x.volume)]).sort((a,b)=>a[0]-b[0])
}
async function runCryptoMonitor(env){
  const limit=Math.max(5,Math.min(40,Number(env.PIONEX_SCAN_LIMIT)||20)),uni=await pionexUniverse(env,limit),items=[];
  for(const x of uni){
    try{const rows=await pionexKlines(env,x.symbol),z=scoreRows(rows,x.turnover,x.changePct,x.base);if(z)items.push(z)}catch(e){if(e.status===429)throw e}
    await sleep(250)
  }
  items.sort((a,b)=>b.score-a.score||b.turnover-a.turnover);
  return {market:"CRYPTO",provider:"PIONEX",universeN:uni.length,items}
}
function tdRows(node){
  return [...(node?.values||[])].map(x=>[Date.parse((x.datetime||"")+"T00:00:00Z"),x.open,x.high,x.low,x.close,x.volume||"0"]).sort((a,b)=>a[0]-b[0])
}
async function runStockMonitor(env){
  if(!env.TWELVE_DATA_API_KEY)throw Error("TWELVE_DATA_API_KEY missing");
  const list=(env.STOCK_WATCHLIST||"AAPL,MSFT,NVDA,AMZN,META,TSLA,AMD,AVGO,GOOGL,PLTR").split(",").map(x=>x.trim().toUpperCase()).filter(Boolean).slice(0,15),q=new URLSearchParams({symbol:list.join(","),interval:"1day",outputsize:"140",order:"asc",timezone:"UTC",prepost:"false"});
  const d=await fetchJson(`${TD}/time_series?${q}`,{headers:{Authorization:`apikey ${env.TWELVE_DATA_API_KEY}`}}),items=[];
  for(const symbol of list){const node=d?.[symbol]||d?.data?.[symbol]||(list.length===1?d:null),rows=tdRows(node);if(!rows.length)continue;const last=rows.at(-1),prev=rows.at(-2),price=+last[4],changePct=prev&&+prev[4]?((price/+prev[4])-1)*100:0,turnover=price*(+last[5]||0),z=scoreRows(rows,turnover,changePct,symbol);if(z)items.push(z)}
  items.sort((a,b)=>b.score-a.score||b.turnover-a.turnover);
  return {market:"STOCKS",provider:"TWELVE_DATA",universeN:list.length,items}
}
async function maybeAlert(env,result,runId){
  const top=result.items[0];if(!top)return {alerted:false};
  const min=Math.max(55,Math.min(100,Number(env.PUSH_SCORE_MIN)||78)),stateKey=`last_push_${result.market}`,prev=await stateGet(env.DB,stateKey),previousTop=await env.DB.prepare("SELECT top_symbol,top_score,ts FROM monitor_runs WHERE market=? AND status='OK' AND id<>? ORDER BY ts DESC LIMIT 1").bind(result.market,runId).first(),changed=!previousTop||previousTop.top_symbol!==top.symbol||Math.abs((+previousTop.top_score||0)-top.score)>=5,cooled=!prev||Date.now()-prev.updatedTs>=60*60*1000;
  if(top.score<min||!changed||!cooled)return {alerted:false,reason:"gate"};
  const payload={title:`${result.market} opportunity · ${top.symbol}`,body:`${top.bias} · score ${top.score.toFixed(0)} · ${top.regime} · SERVER-LITE`,tag:`monitor-${result.market}`,url:"/?panel=cloud",renotify:true},push=await broadcastPush(env,payload);
  if(push.sent>0)await statePut(env.DB,stateKey,JSON.stringify({symbol:top.symbol,score:top.score,runId}));await recordEvent(env,"MONITOR_ALERT",result.market,payload.title,payload.body,{top,push,runId});
  return {alerted:push.sent>0,push}
}
async function executeMonitor(env,trigger="scheduled"){
  if(!env.DB)throw Error("D1 binding DB is required");await ensureTables(env.DB);const results=[];
  if(env.MONITOR_CRYPTO!=="0"){
    try{const r=await runCryptoMonitor(env),w=await writeRun(env,r.market,r.provider,r.universeN,r.items,"OK",trigger),a=await maybeAlert(env,r,w.runId);results.push({...w,...r,alert:a})}
    catch(e){const status=e.status===429?"RATE_LIMITED":"ERROR",w=await writeRun(env,"CRYPTO","PIONEX",0,[],status,e.message);results.push({market:"CRYPTO",status,error:e.message,runId:w.runId})}
  }
  if(env.MONITOR_STOCKS==="1"){
    try{const r=await runStockMonitor(env),w=await writeRun(env,r.market,r.provider,r.universeN,r.items,"OK",trigger),a=await maybeAlert(env,r,w.runId);results.push({...w,...r,alert:a})}
    catch(e){const w=await writeRun(env,"STOCKS","TWELVE_DATA",0,[],"ERROR",e.message);results.push({market:"STOCKS",status:"ERROR",error:e.message,runId:w.runId})}
  }
  await statePut(env.DB,"last_monitor",JSON.stringify({ts:Date.now(),trigger,results:results.map(x=>({market:x.market,runId:x.runId,status:x.status||"OK",top:x.top?.symbol||x.items?.[0]?.symbol||null}))}));await applyRetention(env);
  return results
}

export default {
  async scheduled(event,env,ctx){ctx.waitUntil(executeMonitor(env,"scheduled"))},
  async fetch(request,env){
    const u=new URL(request.url);
    const token=request.headers.get("authorization")?.replace(/^Bearer\s+/i,"");
    if(u.pathname==="/health"){if(env.MONITOR_TOKEN&&token===env.MONITOR_TOKEN)return json({ok:true,service:"crypto-radar-monitor",pushConfigured:pushConfigured(env),db:!!env.DB,crypto:env.MONITOR_CRYPTO!=="0",stocks:env.MONITOR_STOCKS==="1"});return json({ok:true})}
    if(!env.MONITOR_TOKEN||token!==env.MONITOR_TOKEN)return json({error:"Unauthorized"},401);
    if(request.method==="POST"&&u.pathname==="/run"){try{return json({ok:true,results:await executeMonitor(env,"manual")})}catch(e){return json({error:e.message},500)}}
    return json({error:"Not found"},404)
  }
};
