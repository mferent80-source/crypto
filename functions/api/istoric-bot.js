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
  if(action==="raport"){let r=null;try{r=JSON.parse(await env.ISTORIC.get("raport")||"null")}catch{r=null}return json({raport:r})}
  if(action==="contrafactual"){let m={};try{m=JSON.parse(await env.ISTORIC.get("contrafactual")||"{}")}catch{m={}}return json({contrafactual:m&&typeof m==="object"?m:{}})}
  if(action==="semnale"){const bot=idBot(u.searchParams.get("bot"));if(!bot)return json({error:"Lipseste bot"},400);let v=null;try{v=JSON.parse(await env.ISTORIC.get("semnale:"+bot)||"null")}catch{v=null}return json({bot,semnale:v})}
  if(action==="plan"){const bot=idBot(u.searchParams.get("bot"));if(!bot)return json({error:"Lipseste bot"},400);let p=null;try{p=JSON.parse(await env.ISTORIC.get("plan:"+bot)||"null")}catch{p=null}return json({bot,plan:p})}
  if(action==="laborator"){let c=null;try{c=JSON.parse(await env.ISTORIC.get("laborator")||"null")}catch{c=null}return json({laborator:c})}
  if(action==="alerte"){let a=[];try{a=JSON.parse(await env.ISTORIC.get("alerte")||"[]")}catch{a=[]}return json({alerte:Array.isArray(a)?a.slice().reverse():[]})}
  // v97.6: ultimul plan scris pe un bot Pionex (nu T212, nu proba), pentru propunerea la botul nou pornit fara plan
  if(action==="ultimulPlan"){let bun=null;try{const l=await env.ISTORIC.list({prefix:"plan:"});for(const k of (l&&l.keys)||[]){const id=k.name.slice(5);if(/^t212-/.test(id))continue;
      let p=null;try{p=JSON.parse(await env.ISTORIC.get(k.name)||"null")}catch{p=null}if(!p||p.proba||!(p.plus>0||p.minus>0))continue;if(!bun||(p.la||0)>(bun.plan.la||0))bun={bot:id,plan:p}}}catch{bun=null}
    return json(bun||{bot:null,plan:null})}
  // v94: funding-ul pe toata piata + pozele zilnice ale pietei (Home: "ce s-a schimbat de ieri"), de la colector
  if(action==="piata"){let f=null,l=[],so=null;try{f=JSON.parse(await env.ISTORIC.get("piata:funding")||"null")}catch{f=null}try{l=JSON.parse(await env.ISTORIC.get("piata:instantanee")||"[]")}catch{l=[]}try{so=JSON.parse(await env.ISTORIC.get("piata:socoteala")||"null")}catch{so=null}return json({funding:f,instantanee:Array.isArray(l)?l:[],socoteala:so})}
  // v96: pagina Scan - rezumatul zilnic al monedelor si al actiunilor + numele, de la colector
  if(action==="scan"){const ia=async k=>{try{return JSON.parse(await env.ISTORIC.get(k)||"null")}catch{return null}};const urmarite=(await ia("scan:urmarite"))||[];
    if(u.searchParams.get("doar")==="urmarite")return json({urmarite});
    return json({crypto:await ia("scan:c"),actiuni:await ia("scan:a"),nume:(await ia("scan:nume"))||{},istoric:{c:await ia("scan:ist:c"),a:await ia("scan:ist:a")},urmarite})}
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
  const text=await request.text();if(text.length>(action==="scan"?393216:65536))return json({error:"Corp prea mare"},413);
  let corp;try{corp=JSON.parse(text)}catch{return json({error:"JSON invalid"},400)}
  if(action==="piata"){
    const txt=(v,k)=>typeof v==="string"?v.slice(0,k):"",sim=v=>txt(v,16).toUpperCase().replace(/[^A-Z0-9]/g,"");
    const f=corp&&corp.funding;
    if(f&&typeof f==="object")await env.ISTORIC.put("piata:funding",JSON.stringify({la:nr(corp.la)||Date.now(),n:nr(f.n),long:nr(f.long),mediana:nr(f.mediana),uzual:nr(f.uzual),raport:nr(f.raport),
      ton:f.ton==="atentie"?"atentie":"neutru",text:txt(f.text,300),inghesuiti:(Array.isArray(f.inghesuiti)?f.inghesuiti:[]).slice(0,5).map(x=>({s:sim(x&&x.s),rate:nr(x&&x.rate)})).filter(x=>x.s&&x.rate!==null)}));
    // v95: socoteala alertelor (cate miscari neobisnuite au continuat)
    const so=corp&&corp.socoteala;
    if(so&&typeof so==="object")await env.ISTORIC.put("piata:socoteala",JSON.stringify({la:nr(corp.la)||Date.now(),n:nr(so.n),n1:nr(so.n1),continua1:nr(so.continua1),n3:nr(so.n3),continua3:nr(so.continua3),text:txt(so.text,300),textVreme:txt(so.textVreme,300)}));
    const z=corp&&corp.instantaneu;
    if(z&&typeof z==="object"&&/^\d{4}-\d{2}-\d{2}$/.test(String(z.zi))){
      let l=[];try{l=JSON.parse(await env.ISTORIC.get("piata:instantanee")||"[]")}catch{l=[]}if(!Array.isArray(l))l=[];
      const o={zi:z.zi};["fg","inMiscare","vix","ndxE50","btc","largime","fundingMed","botiTotal","t212Total","t212Ppl"].forEach(k=>{const v=nr(z[k]);if(v!==null)o[k]=v});
      l=l.filter(x=>x&&x.zi!==z.zi);l.push(o);l.sort((a,b)=>a.zi<b.zi?-1:1);
      await env.ISTORIC.put("piata:instantanee",JSON.stringify(l.slice(-14)));
    }
    return json({ok:true});
  }
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
  if(action==="scan"){
    // v96: un rand = rezumatul zilnic (Scan.rezumat) + pentru monede campurile din clasament; restul se arunca
    const NR=["p","ch","ch7","ch30","rsi","mis","dMax20","dMin20","atrPct","vol","rang","gs","grile","pas","traversari","latime"],BO=["e20","e50","sparge","miscare","inafara"];
    const rand=x=>{if(!x||typeof x!=="object")return null;const s=String(x.s||"").toUpperCase().replace(/[^A-Z0-9.-]/g,"").slice(0,16);if(!s||!(nr(x.p)>0))return null;
      const o={s};NR.forEach(k=>{const v=nr(x[k]);if(v!==null)o[k]=v});BO.forEach(k=>{if(x[k]!==undefined)o[k]=!!x[k]});o.e200=x.e200===null||x.e200===undefined?null:!!x.e200;
      if(typeof x.tk==="string")o.tk=x.tk.replace(/[^A-Za-z0-9._]/g,"").slice(0,24);
      if(["evita","candidat","fara-date"].includes(x.stare))o.stare=x.stare;if(["long","neutru","short"].includes(x.dir))o.dir=x.dir;if(["tare","mediu","slab"].includes(x.tarie))o.tarie=x.tarie;
      o.spark=(Array.isArray(x.spark)?x.spark:[]).slice(-30).map(nr).filter(v=>v!==null&&v>0);return o};
    if(corp&&(corp.fel==="c"||corp.fel==="a")){
      const la=nr(corp.la),l=Array.isArray(corp.randuri)?corp.randuri.slice(0,300).map(rand).filter(Boolean):[];
      if(la===null||!l.length)return json({error:"Lipseste la sau randuri"},400);
      await env.ISTORIC.put("scan:"+corp.fel,JSON.stringify({la,randuri:l}));
      return json({ok:true,randuri:l.length});
    }
    if(corp&&corp.nume&&typeof corp.nume==="object"){
      const o={};Object.keys(corp.nume).slice(0,800).forEach(k=>{if(/^[ca][A-Z0-9.-]{1,16}$/.test(k)&&typeof corp.nume[k]==="string")o[k]=corp.nume[k].replace(/[<>]/g,"").slice(0,80)});
      await env.ISTORIC.put("scan:nume",JSON.stringify(o));
      return json({ok:true,nume:Object.keys(o).length});
    }
    // v96.2: simbolurile urmarite de el (alerta pe Discord la intrarea / iesirea dintr-o reteta) - lista intreaga, max 60
    if(corp&&Array.isArray(corp.urmarite)){
      const l=[...new Set(corp.urmarite.filter(x=>typeof x==="string"&&/^[ca][A-Z0-9.-]{1,16}$/.test(x)))].slice(0,60);
      await env.ISTORIC.put("scan:urmarite",JSON.stringify(l));
      return json({ok:true,urmarite:l});
    }
    // v96.2: cat a mers fiecare reteta in trecut (colectorul, o data pe zi pe piata)
    const ist=corp&&corp.istoric;
    if(ist&&(ist.fel==="c"||ist.fel==="a")){
      const sum=o=>({n:nr(o&&o.n)||0,pe:nr(o&&o.pe),med:nr(o&&o.med)}),o={la:nr(ist.la)||Date.now(),instr:nr(ist.instr)||0,ore:(Array.isArray(ist.ore)?ist.ore:[]).slice(0,2).map(nr)};
      ["baza","trend","revenire","spargere","miscare"].forEach(k=>{const x=ist[k];o[k]={s:sum(x&&x.s),l:sum(x&&x.l)}});
      await env.ISTORIC.put("scan:ist:"+ist.fel,JSON.stringify(o));
      return json({ok:true});
    }
    return json({error:"Lipseste fel sau nume"},400);
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
  if(action==="raport"){
    const la=nr(corp&&corp.la),linii=corp&&Array.isArray(corp.linii)?corp.linii.slice(0,16).map(x=>typeof x==="string"?x.slice(0,400):"").filter(Boolean):null;
    if(la===null||!linii)return json({error:"Lipseste la sau linii"},400);
    await env.ISTORIC.put("raport",JSON.stringify({la,linii,saptamana:typeof corp.saptamana==="string"?corp.saptamana.slice(0,12):null}));
    return json({ok:true});
  }
  if(action==="contrafactual"){
    const l=corp&&Array.isArray(corp.boti)?corp.boti.slice(0,50):null;if(!l)return json({error:"Lipseste boti"},400);
    let m={};try{m=JSON.parse(await env.ISTORIC.get("contrafactual")||"{}")}catch{m={}}
    if(!m||typeof m!=="object")m={};
    const txt=(v,k)=>typeof v==="string"?v.slice(0,k):"";
    for(const x of l){const id=idBot(x&&x.id);if(!id||!x.zice)continue;
      m[id]={nivel:["porneste","asteapta","nu","fara-date"].includes(x.zice.nivel)?x.zice.nivel:"fara-date",motive:(Array.isArray(x.zice.motive)?x.zice.motive:[]).slice(0,4).map(v=>txt(v,200)),dirTrend:txt(x.zice.dirTrend,8)||null,la:Date.now()}}
    const ids=Object.keys(m);if(ids.length>500)for(const id of ids.slice(0,ids.length-500))delete m[id];
    await env.ISTORIC.put("contrafactual",JSON.stringify(m));
    return json({ok:true,n:Object.keys(m).length});
  }
  if(action==="semnale"){
    const bot=idBot(corp&&corp.bot);if(!bot)return json({error:"Lipseste bot"},400);
    const txt=(v,m)=>typeof v==="string"?v.slice(0,m):"";
    const NIV=["tine","atentie","iesi","info"];
    const log=(Array.isArray(corp.log)?corp.log:[]).slice(-200).map(e=>e&&typeof e==="object"?{t:nr(e.t),cod:txt(e.cod,24).replace(/[^a-z0-9-]/g,""),nivel:NIV.includes(e.nivel)?e.nivel:"info",motiv:txt(e.motiv,200),total:nr(e.total),dreptate:e.dreptate===true?true:e.dreptate===false?false:null,totalDupa:nr(e.totalDupa)}:null).filter(e=>e&&e.t!==null);
    const a=corp.acum&&typeof corp.acum==="object"?corp.acum:null;
    const acum=a?{la:nr(a.la),btc:a.btc&&typeof a.btc==="object"?{nivel:txt(a.btc.nivel,10),text:txt(a.btc.text,300)}:null,aglomerare:a.aglomerare&&typeof a.aglomerare==="object"?{nivel:txt(a.aglomerare.nivel,10),text:txt(a.aglomerare.text,400)}:null,afaraOre:nr(a.afaraOre),regimBtc:a.regimBtc&&typeof a.regimBtc==="object"?{r4h:nr(a.regimBtc.r4h),r24h:nr(a.regimBtc.r24h),miscare:!!a.regimBtc.miscare}:null}:null;
    await env.ISTORIC.put("semnale:"+bot,JSON.stringify({log,acum}));
    return json({ok:true,log:log.length});
  }
  if(action==="plan"){
    const bot=idBot(corp&&corp.bot);if(!bot)return json({error:"Lipseste bot"},400);
    const p=corp&&corp.plan;
    if(p===null){await env.ISTORIC.put("plan:"+bot,"null");return json({ok:true,plan:null})}
    const poz=v=>{const x=nr(v);return x!==null&&x>0&&x<1e7?x:null};
    // v85: pe actiunile T212 (bot = "t212-<TICKER>") planul are stop, tinta si "ies la -X% de la maxim"
    const tr=poz(p&&p.trailPct);
    const plan={plus:poz(p&&p.plus),minus:poz(p&&p.minus),afaraOre:poz(p&&p.afaraOre),stop:poz(p&&p.stop),tinta:poz(p&&p.tinta),trailPct:tr!==null&&tr<=90?tr:null,la:Date.now()};
    // v88: planul pus de o PROBA de ecran ramane marcat, ca sa nu declanseze alerte reale (colectorul il sare)
    if(p&&p.proba===true)plan.proba=true;
    await env.ISTORIC.put("plan:"+bot,JSON.stringify(plan));
    return json({ok:true,plan});
  }
  if(action==="laborator"){
    const la=nr(corp&&corp.la),q=corp&&Array.isArray(corp.intrebari)?corp.intrebari:null;
    if(la===null||!q)return json({error:"Lipseste la sau intrebari"},400);
    const g=x=>x&&typeof x==="object"?{n:nr(x.n),nEf:nr(x.nEf),pePlus:nr(x.pePlus),mediana:nr(x.mediana),ic:Array.isArray(x.ic)?[nr(x.ic[0]),nr(x.ic[1])]:null}:null;
    const txt=(v,m)=>typeof v==="string"?v.slice(0,m):"";
    const curate=q.slice(0,10).map(x=>x&&typeof x==="object"?{id:txt(x.id,32).replace(/[^a-z0-9-]/g,""),titlu:txt(x.titlu,160),eticheteA:txt(x.eticheteA,40),eticheteB:txt(x.eticheteB,40),verdict:["dovedit","contrazis","n-am-aflat"].includes(x.verdict)?x.verdict:"n-am-aflat",A:g(x.A),B:g(x.B),alegere:{A:g(x.alegere&&x.alegere.A),B:g(x.alegere&&x.alegere.B)},nevazut:{A:g(x.nevazut&&x.nevazut.A),B:g(x.nevazut&&x.nevazut.B)}}:null).filter(Boolean);
    // v101.9: „gridul dupa planul tau” pe monedele laboratorului - curatat: simbol A-Z0-9_, numere sau null, cel mult 30
    const v2=x=>x&&typeof x==="object"?{levier:nr(x.levier),jos:nr(x.jos),sus:nr(x.sus),laStop:nr(x.laStop),laTinta:nr(x.laTinta),n:nr(x.n),stop:nr(x.stop),tinta:nr(x.tinta),inGrid:nr(x.inGrid),lichidari:nr(x.lichidari),mediaUsdt:nr(x.mediaUsdt),oreTipic:nr(x.oreTipic)}:null;
    const pm=corp&&corp.planMonede&&typeof corp.planMonede==="object"&&Array.isArray(corp.planMonede.monede)?corp.planMonede:null;
    const planMonede=pm?{dir:pm.dir==="short"?"short":"long",plan:{plus:nr(pm.plan&&pm.plan.plus),minus:nr(pm.plan&&pm.plan.minus)},suma:nr(pm.suma),levier:nr(pm.levier),nota:txt(pm.nota,200),
      monede:pm.monede.map(x=>x&&typeof x==="object"?{simbol:txt(x.simbol,40).toUpperCase().replace(/[^A-Z0-9_]/g,""),ta:v2(x.ta),mea:v2(x.mea)}:null).filter(x=>x&&x.simbol).slice(0,30)}:null;
    await env.ISTORIC.put("laborator",JSON.stringify({la,H:nr(corp.H),monede:nr(corp.monede),ferestre:nr(corp.ferestre),intrebari:curate,planMonede}),{expirationTtl:3*24*3600});
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
