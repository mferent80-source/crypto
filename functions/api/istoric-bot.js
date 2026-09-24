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
  // v79 F3: clasamentul "pe care monede pornesc grid acum?", scris de colector o data pe ora
  if(action==="clasament"){let c=null;try{c=JSON.parse(await env.ISTORIC.get("clasament")||"null")}catch{c=null}return json({clasament:c})}
  // v79.1: alertele colectorului (fara ntfy) - cele mai noi primele
  if(action==="laborator"){let c=null;try{c=JSON.parse(await env.ISTORIC.get("laborator")||"null")}catch{c=null}return json({laborator:c})}
  if(action==="alerte"){let a=[];try{a=JSON.parse(await env.ISTORIC.get("alerte")||"[]")}catch{a=[]}return json({alerte:Array.isArray(a)?a.slice().reverse():[]})}
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
  if(action==="clasament"){
    const la=nr(corp&&corp.la),monede=corp&&Array.isArray(corp.monede)?corp.monede:null;
    if(la===null||!monede)return json({error:"Lipseste la sau monede"},400);
    // se pastreaza doar campurile cunoscute, cu numerele curatate (lipsa = null, nu 0)
    const CAMP_NR=["volum","pret","latime","pas","grile","profitGrila","traversariZi","scor"];
    const curate=monede.slice(0,150).map(m=>{if(!m||typeof m!=="object")return null;const o={simbol:String(m.simbol||"").toUpperCase().replace(/[^A-Z0-9_]/g,"").slice(0,32),stare:["evita","candidat","fara-date"].includes(m.stare)?m.stare:"fara-date",dir:["long","neutru","short"].includes(m.dir)?m.dir:null,tarie:typeof m.tarie==="string"?m.tarie.slice(0,12):null,regim:m.regim&&typeof m.regim==="object"?{r4h:nr(m.regim.r4h),r24h:nr(m.regim.r24h),miscare:!!m.regim.miscare}:null};for(const k of CAMP_NR)o[k]=nr(m[k]);return o.simbol?o:null}).filter(Boolean);
    // expira dupa 6 ore: un clasament de ieri nu trebuie sa arate ca unul de azi
    await env.ISTORIC.put("clasament",JSON.stringify({la,monede:curate}),{expirationTtl:6*3600});
    return json({ok:true,monede:curate.length});
  }
  if(action==="laborator"){
    const la=nr(corp&&corp.la),q=corp&&Array.isArray(corp.intrebari)?corp.intrebari:null;
    if(la===null||!q)return json({error:"Lipseste la sau intrebari"},400);
    const g=x=>x&&typeof x==="object"?{n:nr(x.n),nEf:nr(x.nEf),pePlus:nr(x.pePlus),mediana:nr(x.mediana),ic:Array.isArray(x.ic)?[nr(x.ic[0]),nr(x.ic[1])]:null}:null;
    const txt=(v,m)=>typeof v==="string"?v.slice(0,m):"";
    const curate=q.slice(0,10).map(x=>x&&typeof x==="object"?{id:txt(x.id,32).replace(/[^a-z0-9-]/g,""),titlu:txt(x.titlu,160),eticheteA:txt(x.eticheteA,40),eticheteB:txt(x.eticheteB,40),verdict:["dovedit","contrazis","n-am-aflat"].includes(x.verdict)?x.verdict:"n-am-aflat",A:g(x.A),B:g(x.B),alegere:{A:g(x.alegere&&x.alegere.A),B:g(x.alegere&&x.alegere.B)},nevazut:{A:g(x.nevazut&&x.nevazut.A),B:g(x.nevazut&&x.nevazut.B)}}:null).filter(Boolean);
    await env.ISTORIC.put("laborator",JSON.stringify({la,H:nr(corp.H),monede:nr(corp.monede),ferestre:nr(corp.ferestre),intrebari:curate}),{expirationTtl:3*24*3600});
    return json({ok:true,intrebari:curate.length});
  }
  if(action==="alerte"){
    const a=corp&&corp.alerta;
    const t=nr(a&&a.t),titlu=a&&typeof a.titlu==="string"?a.titlu.slice(0,200):"";
    if(t===null||!titlu)return json({error:"Lipseste t sau titlu"},400);
    const NIVEL=["info","atentie","critic"];
    const intrare={t,nivel:NIVEL.includes(a.nivel)?a.nivel:"info",titlu,mesaj:typeof a.mesaj==="string"?a.mesaj.slice(0,600):"",bot:idBot(a.bot)||null,cheie:typeof a.cheie==="string"?a.cheie.replace(/[^A-Za-z0-9_-]/g,"").slice(0,32):null};
    let lista=[];try{lista=JSON.parse(await env.ISTORIC.get("alerte")||"[]")}catch{lista=[]}
    if(!Array.isArray(lista))lista=[];
    lista.push(intrare);lista.sort((x,y)=>x.t-y.t);
    const de=Date.now()-PASTRARE_MS;lista=lista.filter(x=>x&&x.t>=de).slice(-100);
    await env.ISTORIC.put("alerte",JSON.stringify(lista));
    return json({ok:true,alerte:lista.length});
  }
  if(action==="config"){
    const vechi=(await citesteConfig(env))||{},nou={...vechi};
    if(corp&&corp.canal!=null){const c=String(corp.canal);if(!["radar","ntfy","telegram","discord"].includes(c))return json({error:"canal invalid"},400);nou.canal=c}
    if(corp&&corp.ntfyTopic!=null){if(!/^[A-Za-z0-9_-]{8,64}$/.test(String(corp.ntfyTopic)))return json({error:"ntfyTopic invalid"},400);nou.ntfyTopic=String(corp.ntfyTopic)}
    const la=nr(corp&&corp.colectorLa);if(la!==null)nou.colectorLa=la;
    await env.ISTORIC.put("config",JSON.stringify(nou));
    return json({ok:true,config:nou});
  }
  return json({error:"Unsupported action"},400);
}
