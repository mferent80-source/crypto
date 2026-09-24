import {requireApiAuth,authErrorResponse} from "../_shared/auth.js";
import {pionexPrivatGet} from "../_shared/pionex.js";
const H={"content-type":"application/json","cache-control":"no-store"};
const json=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:H});

// Randurile au forma pe care o randeaza runProviderHealthV62 din app.js:
// {name, state, latencyMs, detail, required, configured}
// Stari citite de ecran: OK · CONFIGURED · DEGRADED · STALE · FAIL
// Doar OK si CONFIGURED sunt numarate ca bune, si doar cand required!==false.
// Fara latencyMs la randurile de configurare: tabelul afiseaza "0 ms" pentru
// null (+null===0), ceea ce ar arata ca o masuratoare care nu s-a facut.
const rand=(name,state,detail,required=true,extra={})=>
  ({name,state,detail,required,configured:state!=="FAIL",...extra});

// Probele de retea au cronometru si nu arunca niciodata: o gazda moarta trebuie
// sa apara ca un rand FAIL cu motivul la vedere, nu sa darame ruta.
async function probeaza(name,url,required=true,ms=6000,antete={}){
  const t0=Date.now();
  const opreste=new AbortController(),ceas=setTimeout(()=>opreste.abort(),ms);
  try{
    const r=await fetch(url,{headers:{accept:"application/json",...antete},signal:opreste.signal});
    const latentaMs=Date.now()-t0;
    if(!r.ok){
      const corp=(await r.text().catch(()=>"")).slice(0,90).replace(/\s+/g," ").trim();
      return rand(name,"FAIL",`HTTP ${r.status}${corp?" · "+corp:""}`,required,{latencyMs:latentaMs});
    }
    return rand(name,"OK",`HTTP ${r.status}`,required,{latencyMs:latentaMs});
  }catch(e){
    const motiv=e?.name==="AbortError"?`fara raspuns in ${ms} ms`:String(e?.message||e).slice(0,90);
    return rand(name,"FAIL",motiv,required,{latencyMs:Date.now()-t0});
  }finally{clearTimeout(ceas)}
}

async function cheiaPionex(env){
  const nume="PIONEX · cheia API (citire boti)";
  if(!(env.PIONEX_API_KEY&&env.PIONEX_API_SECRET))return rand(nume,"FAIL","lipsesc PIONEX_API_KEY / PIONEX_API_SECRET");
  const t0=Date.now();
  try{
    const {r,data}=await pionexPrivatGet(env,"/api/v1/bot/orders",{limit:1});
    const latencyMs=Date.now()-t0,cod=String(data?.code||""),mesaj=String(data?.message||"").slice(0,80);
    if(r.ok&&data?.result===true&&Array.isArray(data?.data?.results))return rand(nume,"OK","ok · citirea bot/orders a mers",true,{latencyMs});
    if(/PERMISSION/i.test(cod))return rand(nume,"FAIL","fără Bot reading · bifează-l în Pionex › API Management",true,{latencyMs});
    if(r.status===401||r.status===403||/KEY|SIGN|AUTH|TIMESTAMP/i.test(cod))return rand(nume,"FAIL",`cheie invalidă · ${cod||"HTTP "+r.status}${mesaj?" · "+mesaj:""}`,true,{latencyMs});
    return rand(nume,"FAIL",`răspuns neașteptat · ${cod||"HTTP "+r.status}${mesaj?" · "+mesaj:""}`,true,{latencyMs});
  }catch(e){
    if(e?.status===429)return rand(nume,"DEGRADED",`429 · Pionex cere pauză ${e.retryAfter||"?"} s · cheia nu s-a putut verifica acum`,true,{latencyMs:Date.now()-t0});
    return rand(nume,"FAIL",String(e?.message||e).slice(0,90),true,{latencyMs:Date.now()-t0});
  }
}

export async function onRequestGet({request,env}){
  const auth=await requireApiAuth(request,env,"provider-health",30);
  if(!auth.ok)return authErrorResponse(auth,H);

  const u=new URL(request.url),adanc=u.searchParams.get("deep")==="1";
  const providers=[];

  // --- ce e configurat pe server (nu costa nicio cerere) ---
  // Pionex: nu ajunge ca variabilele sa existe - o cheie stearsa, fara "Bot reading"
  // sau in racire arata la fel. Se face o citire REALA bot/orders (limit 1), prin
  // aceeasi poarta de ritm ca restul cererilor private.
  providers.push(await cheiaPionex(env));

  providers.push(rand("D1 · depozitul de istoric",env.DB?.prepare?"CONFIGURED":"FAIL",
    env.DB?.prepare?"legatura DB exista":"DB nelegat · nu se salveaza rulari, snapshot-uri sau semnale"));

  providers.push(rand("KV · limitare de rata",env.API_RATE_LIMIT?.get?"CONFIGURED":"DEGRADED",
    env.API_RATE_LIMIT?.get?"API_RATE_LIMIT legat":"nelegat · limita cade pe memoria izolatului, deci se pierde",false));

  const vapid=!!(env.VAPID_PUBLIC_KEY&&env.VAPID_PRIVATE_KEY);
  providers.push(rand("PUSH · chei VAPID",vapid?"CONFIGURED":"DEGRADED",
    vapid?"VAPID pus":"fara VAPID · alertele prin notificare nu pot pleca",false));

  providers.push(rand("COINGECKO · cheie",env.COINGECKO_API_KEY?"CONFIGURED":"DEGRADED",
    env.COINGECKO_API_KEY?"COINGECKO_API_KEY pus":"fara cheie · CoinGecko refuza cererile de pe Cloudflare",false));

  providers.push(rand("TWELVE DATA · cheie actiuni",env.TWELVE_DATA_API_KEY?"CONFIGURED":"DEGRADED",
    env.TWELVE_DATA_API_KEY?"TWELVE_DATA_API_KEY pus":"fara cheie · modulul de actiuni e oprit",false));

  // --- accesibilitatea reala, doar la cerere ---
  // Masurat 22.09: de pe Cloudflare, Pionex da 429 cu galeata plina, Binance 403,
  // CoinGecko 429. De aceea randurile astea exista: pana acum tacerea lor era
  // singurul semn ca ceva nu merge.
  if(adanc){
    const probe=await Promise.all([
      probeaza("PIONEX · acces de pe server","https://api.pionex.com/api/v1/market/tickers?type=SPOT"),
      probeaza("BINANCE FUTURES · acces de pe server","https://fapi.binance.com/fapi/v1/premiumIndex?symbol=BTCUSDT"),
      probeaza("COINGECKO · acces de pe server","https://api.coingecko.com/api/v3/ping",false,6000,{"user-agent":"CryptoRadar/74 (+read-only)"}),
    ]);
    providers.push(...probe);
  }

  const obligatorii=providers.filter(x=>x.required!==false);
  const bune=obligatorii.filter(x=>x.state==="OK"||x.state==="CONFIGURED").length;
  return json({
    checkedAt:Date.now(),
    deep:adanc,
    providers,
    summary:{total:providers.length,required:obligatorii.length,ok:bune},
  });
}
