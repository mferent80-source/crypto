// Istoricul botului pastrat pe SERVERUL DE ACASA (KV local al lui wrangler,
// legat cu --kv ISTORIC de lansator). Il scrie colectorul (scripts/colector.mjs)
// o data pe minut, cat PC-ul e pornit; il citeste Tabloul, ca verdictul si
// dovada sa nu mai porneasca de la zero la fiecare deschidere.
// Pe pagina publicata (Cloudflare) nu exista ISTORIC -> 503 cu motiv, iar
// Tabloul ramane pe istoricul din browser.
import {requireApiAuth,authErrorResponse,sameOrigin} from "../_shared/auth.js";

const H={"content-type":"application/json","cache-control":"no-store"};
const json=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:H});
const PASTRARE_MS=7*24*3600000;
const CAMPURI=["perechi","pretPerp","profitNet","comisioane","gridProfitBrut","investit","profitTotal","distantaLichidarePct"];
// Lipsa ramane null (Number(null) ar da 0, iar un 0 in istoric ar minti).
const nr=v=>{if(typeof v==="number")return Number.isFinite(v)?v:null;if(typeof v!=="string"||!v.trim())return null;const x=Number(v);return Number.isFinite(x)?x:null};
const idBot=v=>String(v||"").replace(/[^A-Za-z0-9_-]/g,"").slice(0,64);

function curata(x){
  if(!x||typeof x!=="object")return null;
  // o intrare din viitor n-ar mai expira niciodata
  const t=nr(x.t);if(t===null||t<=0||t>Date.now()+5*60000)return null;
  const out={t};for(const k of CAMPURI)out[k]=nr(x[k]);
  return out;
}
async function citesteLista(env,bot){try{const v=JSON.parse(await env.ISTORIC.get("ist:"+bot)||"[]");return Array.isArray(v)?v:[]}catch{return []}}
async function citesteConfig(env){try{return JSON.parse(await env.ISTORIC.get("config")||"null")}catch{return null}}
const faraKv=()=>json({error:"ISTORIC_DOAR_ACASA",detail:"Istoricul de pe server merge doar pe serverul de acasă (PORNESTE-CRYPTO-RADAR.bat)."},503);

export async function onRequestGet({request,env}){
  const auth=await requireApiAuth(request,env,"istoric-read",120);if(!auth.ok)return authErrorResponse(auth,H);
  if(!env.ISTORIC?.get)return faraKv();
  const u=new URL(request.url),action=u.searchParams.get("action")||"citeste";
  if(action==="config")return json({config:await citesteConfig(env)});
  if(action!=="citeste")return json({error:"Unsupported action"},400);
  const bot=idBot(u.searchParams.get("bot"));if(!bot)return json({error:"Lipseste bot"},400);
  const ore=Math.min(168,Math.max(1,Math.floor(Number(u.searchParams.get("ore")))||24));
  const de=Date.now()-ore*3600000;
  const lista=(await citesteLista(env,bot)).filter(x=>x&&x.t>=de);
  return json({bot,ore,intrari:lista,config:await citesteConfig(env)});
}

export async function onRequestPost({request,env}){
  const auth=await requireApiAuth(request,env,"istoric-write",30);if(!auth.ok)return authErrorResponse(auth,H);
  if(!sameOrigin(request))return json({error:"Origin rejected"},403);
  if(!env.ISTORIC?.put)return faraKv();
  const u=new URL(request.url),action=u.searchParams.get("action");
  const text=await request.text();if(text.length>65536)return json({error:"Corp prea mare"},413);
  let corp;try{corp=JSON.parse(text)}catch{return json({error:"JSON invalid"},400)}
  if(action==="adauga"){
    const bot=idBot(corp&&corp.bot),intrare=curata(corp&&corp.intrare);
    if(!bot||!intrare)return json({error:"Lipseste bot sau intrare valida"},400);
    const lista=await citesteLista(env,bot);
    // O intrare pe minut: a doua din acelasi minut o inlocuieste pe prima.
    const minut=Math.floor(intrare.t/60000);
    const fara=lista.filter(x=>x&&Math.floor(x.t/60000)!==minut);
    fara.push(intrare);fara.sort((a,b)=>a.t-b.t);
    const de=Date.now()-PASTRARE_MS,pastrat=fara.filter(x=>x.t>=de);
    await env.ISTORIC.put("ist:"+bot,JSON.stringify(pastrat));
    return json({ok:true,intrari:pastrat.length});
  }
  if(action==="config"){
    const vechi=(await citesteConfig(env))||{},nou={...vechi};
    if(corp&&corp.ntfyTopic!=null){if(!/^[A-Za-z0-9_-]{8,64}$/.test(String(corp.ntfyTopic)))return json({error:"ntfyTopic invalid"},400);nou.ntfyTopic=String(corp.ntfyTopic)}
    const la=nr(corp&&corp.colectorLa);if(la!==null)nou.colectorLa=la;
    await env.ISTORIC.put("config",JSON.stringify(nou));
    return json({ok:true,config:nou});
  }
  return json({error:"Unsupported action"},400);
}
