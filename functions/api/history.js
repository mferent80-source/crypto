import {requireApiAuth,authErrorResponse,sameOrigin as strictSameOrigin,tenantKey} from "../_shared/auth.js";
const H={"content-type":"application/json","cache-control":"no-store"};
const json=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:H});
const lim=(v,d=20,max=200)=>Math.max(1,Math.min(max,Number(v)||d));
const txt=(v,n=120)=>String(v??"").slice(0,n);
const num=v=>Number.isFinite(Number(v))?Number(v):null;
const now=()=>Date.now();

function sameOrigin(request){return strictSameOrigin(request)}
function dbReady(env){return !!env.DB}
async function schemaState(db){
  const q=await db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name IN ('monitor_runs','monitor_items','research_snapshots','signal_snapshots','app_events')`).all();
  return new Set((q.results||[]).map(x=>x.name));
}
async function requireTables(db){
  const s=await schemaState(db);
  if(!s.has("monitor_runs")||!s.has("monitor_items"))throw Object.assign(Error("D1 schema is not initialized. Run db/schema.sql."),{status:503});
  return s
}
async function ensureTenantColumns(db){
  const defs={monitor_runs:"TEXT NOT NULL DEFAULT 'monitor'",research_snapshots:"TEXT NOT NULL DEFAULT 'legacy'",signal_snapshots:"TEXT NOT NULL DEFAULT 'legacy'",app_events:"TEXT NOT NULL DEFAULT 'monitor'"};
  for(const [table,def] of Object.entries(defs)){try{const q=await db.prepare(`PRAGMA table_info(${table})`).all(),has=(q.results||[]).some(x=>x.name==="tenant");if(!has)await db.prepare(`ALTER TABLE ${table} ADD COLUMN tenant ${def}`).run()}catch{}}
  for(const sql of ["CREATE INDEX IF NOT EXISTS idx_monitor_runs_tenant_ts ON monitor_runs(tenant,ts DESC)","CREATE INDEX IF NOT EXISTS idx_research_tenant_ts ON research_snapshots(tenant,ts DESC)","CREATE INDEX IF NOT EXISTS idx_signal_tenant_ts ON signal_snapshots(tenant,updated_ts DESC)","CREATE INDEX IF NOT EXISTS idx_events_tenant_ts ON app_events(tenant,ts DESC)"])try{await db.prepare(sql).run()}catch{}
}
function safeJson(v,max=12000){
  try{const x=JSON.stringify(v??null);return x.length>max?x.slice(0,max):x}catch{return null}
}
async function insertScannerRun(db,b,tenant){
  const ts=num(b.ts)||now(),market=txt(b.market||"CRYPTO",20),provider=txt(b.provider||"UNKNOWN",30),mode=txt(b.mode||"CLIENT",30),items=Array.isArray(b.items)?b.items.slice(0,120):[];
  const run=await db.prepare(`INSERT INTO monitor_runs(tenant,ts,market,provider,mode,universe_n,processed_n,status,top_symbol,top_score,note) VALUES(?,?,?,?,?,?,?,?,?,?,?)`)
    .bind(tenant,ts,market,provider,mode,Math.max(0,Number(b.universeN)||items.length),Math.max(0,Number(b.processedN)||items.length),txt(b.status||"OK",40),txt(b.topSymbol||items[0]?.symbol||"",30)||null,num(b.topScore),txt(b.note||"",500)||null).run();
  const runId=run.meta?.last_row_id;
  if(!runId)throw Error("D1 did not return scanner run id");
  if(items.length){
    const stmts=items.map((x,i)=>db.prepare(`INSERT INTO monitor_items(run_id,rank,market,symbol,source,bias,score,confidence,adx,rsi,regime,price,change_pct,turnover,payload_json) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(runId,Math.max(1,Number(x.rank)||i+1),market,txt(x.symbol,30),txt(x.source||provider,30),txt(x.bias||"",30),num(x.score),num(x.confidence),num(x.adx),num(x.rsi),txt(x.regime||"",80),num(x.price),num(x.changePct),num(x.turnover),safeJson(x.payload??x)));
    for(let i=0;i<stmts.length;i+=40)await db.batch(stmts.slice(i,i+40));
  }
  return runId
}

export async function onRequestGet({request,env}){
  const auth=await requireApiAuth(request,env,"history-read",90);if(!auth.ok)return authErrorResponse(auth,H);
  if(!dbReady(env))return json({configured:false,error:"Missing D1 binding DB"},200);
  const u=new URL(request.url),action=u.searchParams.get("action")||"status",db=env.DB,tenant=await tenantKey(request,env);
  try{
    await ensureTenantColumns(db);const tables=await schemaState(db);
    if(action==="status"){
      const schemaOk=["monitor_runs","monitor_items","research_snapshots","signal_snapshots","app_events"].every(x=>tables.has(x));
      let counts={runs:0,snapshots:0,signals:0,events:0},lastRun=null;
      if(schemaOk){
        const rs=await db.batch([
          db.prepare("SELECT COUNT(*) n FROM monitor_runs WHERE tenant='monitor' OR tenant=?").bind(tenant),
          db.prepare("SELECT COUNT(*) n FROM research_snapshots WHERE tenant=?").bind(tenant),
          db.prepare("SELECT COUNT(*) n FROM signal_snapshots WHERE tenant=?").bind(tenant),
          db.prepare("SELECT COUNT(*) n FROM app_events WHERE tenant='monitor' OR tenant=?").bind(tenant),
          db.prepare("SELECT * FROM monitor_runs WHERE tenant='monitor' OR tenant=? ORDER BY ts DESC LIMIT 1").bind(tenant)
        ]);
        counts={runs:rs[0].results?.[0]?.n||0,snapshots:rs[1].results?.[0]?.n||0,signals:rs[2].results?.[0]?.n||0,events:rs[3].results?.[0]?.n||0};
        lastRun=rs[4].results?.[0]||null;
      }
      return json({configured:true,schemaOk,browserWrites:env.ALLOW_BROWSER_HISTORY_WRITES==="1",counts,lastRun});
    }
    await requireTables(db);
    if(action==="recent_runs"){
      const n=lim(u.searchParams.get("limit"),12,100),market=txt(u.searchParams.get("market")||"",20);
      const q=market?db.prepare("SELECT * FROM monitor_runs WHERE (tenant='monitor' OR tenant=?) AND market=? ORDER BY ts DESC LIMIT ?").bind(tenant,market,n):db.prepare("SELECT * FROM monitor_runs WHERE tenant='monitor' OR tenant=? ORDER BY ts DESC LIMIT ?").bind(tenant,n);
      const r=await q.all();return json({rows:r.results||[]});
    }
    if(action==="latest_opportunities"){
      const n=lim(u.searchParams.get("limit"),15,100),market=txt(u.searchParams.get("market")||"",20);
      let run;
      if(market)run=await db.prepare("SELECT id,market,ts FROM monitor_runs WHERE (tenant='monitor' OR tenant=?) AND market=? AND status='OK' ORDER BY ts DESC LIMIT 1").bind(tenant,market).first();
      else run=await db.prepare("SELECT id,market,ts FROM monitor_runs WHERE (tenant='monitor' OR tenant=?) AND status='OK' ORDER BY ts DESC LIMIT 1").bind(tenant).first();
      if(!run)return json({run:null,rows:[]});
      const r=await db.prepare("SELECT rank,market,symbol,source,bias,score,confidence,adx,rsi,regime,price,change_pct,turnover FROM monitor_items WHERE run_id=? ORDER BY rank LIMIT ?").bind(run.id,n).all();
      return json({run,rows:r.results||[]});
    }
    if(action==="events"){
      const n=lim(u.searchParams.get("limit"),30,100),r=await db.prepare("SELECT * FROM app_events WHERE tenant='monitor' OR tenant=? ORDER BY ts DESC LIMIT ?").bind(tenant,n).all();return json({rows:r.results||[]});
    }
    if(action==="signals"){
      const n=lim(u.searchParams.get("limit"),30,100),r=await db.prepare("SELECT id,ts,updated_ts,market,symbol,source,tf,mode,direction,confidence,status,net_r FROM signal_snapshots WHERE tenant=? ORDER BY updated_ts DESC LIMIT ?").bind(tenant,n).all();return json({rows:(r.results||[]).map(x=>({...x,id:String(x.id||'').replace(new RegExp(`^${tenant}:`),"")}))});
    }
    if(action==="snapshots"){
      const n=lim(u.searchParams.get("limit"),50,200),symbol=txt(u.searchParams.get("symbol")||"",30),market=txt(u.searchParams.get("market")||"",20);
      let q=db.prepare("SELECT * FROM research_snapshots WHERE tenant=? ORDER BY ts DESC LIMIT ?").bind(tenant,n);
      if(symbol&&market)q=db.prepare("SELECT * FROM research_snapshots WHERE tenant=? AND market=? AND symbol=? ORDER BY ts DESC LIMIT ?").bind(tenant,market,symbol,n);
      const r=await q.all();return json({rows:r.results||[]});
    }
    return json({error:"Unsupported history action"},400);
  }catch(e){return json({configured:true,error:e.message},e.status||500)}
}

export async function onRequestPost({request,env}){
  const auth=await requireApiAuth(request,env,"history-write",30);if(!auth.ok)return authErrorResponse(auth,H);
  if(!sameOrigin(request))return json({error:"Origin rejected"},403);
  if(!dbReady(env))return json({error:"Missing D1 binding DB"},503);
  if(env.ALLOW_BROWSER_HISTORY_WRITES!=="1")return json({error:"Browser history writes are disabled. Set ALLOW_BROWSER_HISTORY_WRITES=1 only if you accept public same-origin research writes."},403);
  const u=new URL(request.url),action=u.searchParams.get("action")||"",db=env.DB,tenant=await tenantKey(request,env);
  try{
    await ensureTenantColumns(db);const tables=await requireTables(db),b=await request.json();
    if(action==="scanner_run"){
      const runId=await insertScannerRun(db,b,tenant);return json({saved:true,runId});
    }
    if(action==="snapshot"){
      if(!tables.has("research_snapshots"))throw Error("research_snapshots table missing");
      await db.prepare(`INSERT INTO research_snapshots(tenant,ts,market,symbol,source,tf,mode,score,opportunity,regime,direction,confidence,price,payload_json) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
        .bind(tenant,num(b.ts)||now(),txt(b.market||"CRYPTO",20),txt(b.symbol,30),txt(b.source||"UNKNOWN",30),txt(b.tf||"",10),txt(b.mode||"",20),num(b.score),num(b.opportunity),txt(b.regime||"",80),txt(b.direction||"",20),num(b.confidence),num(b.price),safeJson(b.payload)).run();
      return json({saved:true});
    }
    if(action==="signal"){
      if(!tables.has("signal_snapshots"))throw Error("signal_snapshots table missing");
      const x=b.signal||{},id=txt(x.id,80);if(!id)return json({error:"Signal id required"},400);
      const confidence=Math.max(Number(x.longConf)||0,Number(x.shortConf)||0),market=txt(x.market||((x.source||"BINANCE")==="TWELVEDATA"?"STOCKS":"CRYPTO"),20),updated=now();
      const dbId=`${tenant}:${id}`;await db.prepare(`INSERT INTO signal_snapshots(id,tenant,ts,updated_ts,market,symbol,source,tf,mode,direction,confidence,status,net_r,payload_json) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT(id) DO UPDATE SET tenant=excluded.tenant,updated_ts=excluded.updated_ts,status=excluded.status,net_r=excluded.net_r,confidence=excluded.confidence,payload_json=excluded.payload_json`)
        .bind(dbId,tenant,num(x.ts)||updated,updated,market,txt(x.symbol,30),txt(x.source||"BINANCE",30),txt(x.tf||"",10),txt(x.mode||"",20),txt(x.direction||"",20),confidence,txt(x.status||"",60),num(x.netR),safeJson(x,20000)).run();
      return json({saved:true,id});
    }
    if(action==="event"){
      if(!tables.has("app_events"))throw Error("app_events table missing");
      await db.prepare(`INSERT INTO app_events(tenant,ts,type,market,symbol,source,severity,title,message,payload_json) VALUES(?,?,?,?,?,?,?,?,?,?)`)
        .bind(tenant,now(),txt(b.type||"APP",40),txt(b.market||"",20)||null,txt(b.symbol||"",30)||null,txt(b.source||"",30)||null,txt(b.severity||"INFO",20),txt(b.title||"",120),txt(b.message||"",500),safeJson(b.payload)).run();
      return json({saved:true});
    }
    return json({error:"Unsupported history write action"},400);
  }catch(e){return json({error:e.message},e.status||500)}
}
