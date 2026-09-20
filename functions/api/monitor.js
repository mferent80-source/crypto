import {requireApiAuth,authErrorResponse,sameOrigin as strictSameOrigin} from "../_shared/auth.js";
const H={"content-type":"application/json","cache-control":"no-store"};
const json=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:H});
function sameOrigin(request){return strictSameOrigin(request)}
function base(env){return String(env.MONITOR_WORKER_URL||"").replace(/\/+$/,"")}

export async function onRequestGet({request,env}){
  const auth=await requireApiAuth(request,env,"monitor-status",30);if(!auth.ok)return authErrorResponse(auth,H);
  const url=base(env);if(!url)return json({configured:false,error:"MONITOR_WORKER_URL not configured"});
  try{const r=await fetch(url+"/health",{headers:{"accept":"application/json",...(env.MONITOR_TOKEN?{"authorization":`Bearer ${env.MONITOR_TOKEN}`}:{})}}),d=await r.json();return json({configured:true,worker:d},r.ok?200:502)}catch(e){return json({configured:true,error:e.message},502)}
}
export async function onRequestPost({request,env}){
  const auth=await requireApiAuth(request,env,"monitor-run",10);if(!auth.ok)return authErrorResponse(auth,H);
  if(!sameOrigin(request))return json({error:"Origin rejected"},403);
  const u=new URL(request.url),action=u.searchParams.get("action")||"run",url=base(env);
  if(action!=="run")return json({error:"Unsupported monitor action"},400);
  if(!url||!env.MONITOR_TOKEN)return json({error:"MONITOR_WORKER_URL / MONITOR_TOKEN not configured"},503);
  try{
    const r=await fetch(url+"/run",{method:"POST",headers:{"accept":"application/json","authorization":`Bearer ${env.MONITOR_TOKEN}`}}),raw=await r.text();let d;try{d=JSON.parse(raw)}catch{d={error:raw||"Invalid monitor response"}}
    return json(d,r.ok?200:r.status)
  }catch(e){return json({error:e.message},502)}
}
