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
  const u=new URL(request.url),action=u.searchParams.get("action")||"subscribe",origin=request.headers.get("origin");
  if(origin&&origin!==u.origin)return json({saved:false,error:"Origin rejected"},403);
  if(!env.PUSH_SUBSCRIPTIONS)return json({saved:false,error:"Missing PUSH_SUBSCRIPTIONS KV binding"},503);
  try{
    const body=await request.json();
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
