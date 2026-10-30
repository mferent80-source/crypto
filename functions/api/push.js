import {requireApiAuth,authErrorResponse,sameOrigin as strictSameOrigin} from "../_shared/auth.js";
import {citesteCorp} from "../_shared/corp-limitat.js";
// v100.272 (ideile auditului 29.10): corpul (o abonare push, ~0,5 KB) cu plafon - înainte se citea oricât de mare
const CORP_MAX=16384;
const H={"content-type":"application/json","cache-control":"no-store"};
const json=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:H});
const enc=new TextEncoder();

async function keyFor(endpoint){
  const hash=await crypto.subtle.digest("SHA-256",enc.encode(endpoint));
  return [...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,"0")).join("");
}
export async function onRequestGet({request,env}){
  const u=new URL(request.url),action=u.searchParams.get("action")||"config";
  if(action==="config"||action==="status"){
    return json({
      configured:!!(env.VAPID_PUBLIC_KEY&&env.PUSH_SUBSCRIPTIONS),
      publicKey:env.VAPID_PUBLIC_KEY||null,
      subscriptionStore:!!env.PUSH_SUBSCRIPTIONS,
      deliverySenderConfigured:!!env.PUSH_SENDER_CONFIGURED
    });
  }
  return json({error:"Unsupported push action"},400);
}
export async function onRequestPost({request,env}){
  const auth=await requireApiAuth(request,env,"push-write",20);if(!auth.ok)return authErrorResponse(auth,H);
  const u=new URL(request.url),action=u.searchParams.get("action")||"subscribe";
  if(!strictSameOrigin(request))return json({saved:false,error:"Origin rejected"},403);
  if(!env.PUSH_SUBSCRIPTIONS)return json({saved:false,error:"Missing PUSH_SUBSCRIPTIONS KV binding"},503);
  try{
    const cit=await citesteCorp(request,CORP_MAX);if(cit.prea)return json({saved:false,error:"Corp prea mare"},413);
    const body=JSON.parse(cit.text);
    if(action==="subscribe"){
      if(!body?.endpoint||!body?.keys?.p256dh||!body?.keys?.auth)return json({saved:false,error:"Invalid PushSubscription"},400);
      const k=await keyFor(body.endpoint);
      await env.PUSH_SUBSCRIPTIONS.put(k,JSON.stringify({subscription:body,createdAt:Date.now()}));
      return json({saved:true,key:k});
    }
    if(action==="unsubscribe"){
      if(!body?.endpoint)return json({saved:false,error:"Missing endpoint"},400);
      const k=await keyFor(body.endpoint);await env.PUSH_SUBSCRIPTIONS.delete(k);return json({saved:true});
    }
    return json({saved:false,error:"Unsupported push action"},400);
  }catch(e){return json({saved:false,error:e.message},500)}
}
