// Cererile PRIVATE catre Pionex (cele semnate cu cheia lui). STRICT READ-ONLY:
// aici se semneaza si se trimit doar GET-uri; caile le aleg rutele.
//
// De ce e un modul comun: pionex-account, bot-orders si provider-health folosesc
// ACEEASI cheie, deci aceeasi limita la Pionex. Cu cate o poarta de ritm in
// fiecare ruta, un 429 luat de una nu oprea celelalte, care loveau mai departe
// o cheie deja in racire. Acum e o singura poarta si o singura racire.
import {dupaCelDinFata,abandonata,eroareAbandon} from "./poarta.js";
import {lacatRamasMs,lacatPanaLa,lacatDinRaspuns,eroareLacat,reseteazaLacatPionex,oraRo} from "./lacat-pionex.js";   // audit 19.10: lacatul comun cu poarta publica
export const PIONEX="https://api.pionex.com";
// Niciun furnizor nu are voie sa tina ruta (si poarta de dupa ea) agatata.
export const TIMEOUT_MS=8000;
const enc=new TextEncoder();

async function hmacHex(secret,mesaj){
  const key=await crypto.subtle.importKey("raw",enc.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const sig=await crypto.subtle.sign("HMAC",key,enc.encode(mesaj));
  return [...new Uint8Array(sig)].map(x=>x.toString(16).padStart(2,"0")).join("");
}
const sortedQuery=p=>Object.keys(p).sort().map(k=>`${k}=${p[k]}`).join("&");

// Ritm. Jurnalul v71 trage pana la 128 de cereri la o sincronizare. Cererile se
// serializeaza si se distanteaza, iar un 429 pune o racire pe care frontendul o
// poate astepta si relua.
const PAUZA_MS=250, RACIRE_MIN_S=15;
let poarta=Promise.resolve(),urmatorulLa=0;
const asteapta=ms=>new Promise(r=>setTimeout(r,ms));
// v91.5: cererea din fata e asteptata cel mult cat poate dura ea legitim (vezi _shared/poarta.js)
const ASTEPTARE_MAX_MS=TIMEOUT_MS+2000;
function cuRitm(fn,semnal=null){
  const intrat=Date.now();   // v100.259 (auditul 23.10, punctul 9): cererea abandonată cât stă la rând nu mai pleacă (poarta.js, abandonata)
  const rulare=dupaCelDinFata(poarta,ASTEPTARE_MAX_MS).then(async()=>{
    if(abandonata(semnal,intrat))throw eroareAbandon();
    // v100.208: lacătul lung (ore) se spune cu ora lui, ca Radarul și colectorul să nu reîncerce la 15 s
    // audit 19.10: lacatul e COMUN cu poarta publica (_shared/lacat-pionex.js)
    if(lacatRamasMs())throw eroareLacat();
    const intarziere=Math.max(0,urmatorulLa-Date.now());
    if(intarziere)await asteapta(intarziere);
    if(abandonata(semnal,intrat))throw eroareAbandon();
    urmatorulLa=Date.now()+PAUZA_MS;
    return fn();
  });
  poarta=rulare.catch(()=>{});
  return rulare;
}
// Doar pentru probe: fiecare proba porneste fara racirea lasata de alta.
export function reseteazaRitmPionex(){poarta=Promise.resolve();urmatorulLa=0;reseteazaLacatPionex()}

// Intoarce {r, data, brut}. Singurul lucru decis aici e 429 (racirea e a cheii);
// restul formei o judeca ruta, fiindca fiecare stie ce asteapta.
// v100.209 (16.10.2026): PROBA DE ECRAN nu mai bate în Pionex — cele 55 de pagini de la fiecare livrare (×2 azi) au ars cota și
// Pionex a blocat IP-ul 3 ore (X-RateLimit-Lock), lăsând măsurarea Busolei fără futures. Proba pune antetul `x-proba-ecran: 1`
// pe toate cererile (CDP), iar aici cererea către Pionex nu pleacă (503, spus).
// v100.214 (18.10.2026): semnul stă pe env-ul CERERII, nu într-un steag comun. Steagul de modul (aprins de middleware cât ținea
// cererea probei) bloca și cererile colectorului / telefonului venite în același timp (9 ori pe 18.10 în data\colector.log),
// iar două probe suprapuse puteau lăsa una să bată în Pionex. Fiecare rută care ajunge aici face env=cuProba(env,request).
export function cuProba(env,request){
  let e=false;try{e=!!(request&&request.headers&&request.headers.get("x-proba-ecran")==="1")}catch{}
  return e?Object.create(env,{__probaEcran:{value:true}}):env
}
export async function pionexPrivatGet(env,path,params={},semnal=null){
  if(env&&env.__probaEcran)throw Object.assign(Error("probă de ecran: fără cereri către Pionex"),{status:503});
  const apiKey=env.PIONEX_API_KEY,secret=env.PIONEX_API_SECRET;
  if(!apiKey||!secret)throw Object.assign(Error("Pionex read-only server secrets are not configured"),{status:503});
  const r=await cuRitm(async()=>{
    const all={...params,timestamp:Date.now()},query=sortedQuery(all),signature=await hmacHex(secret,`GET${path}?${query}`);
    return fetch(`${PIONEX}${path}?${query}`,{headers:{
      "accept":"application/json",
      "PIONEX-KEY":apiKey,
      "PIONEX-SIGNATURE":signature
    },signal:AbortSignal.timeout(TIMEOUT_MS)});
  },semnal).catch(e=>{
    if(e?.status)throw e;
    const motiv=e?.name==="TimeoutError"||e?.name==="AbortError"?`fara raspuns in ${TIMEOUT_MS} ms`:String(e?.message||e);
    throw Object.assign(Error(`Pionex: ${motiv}`),{status:504});
  });
  const brut=await r.text();let data=null;try{data=JSON.parse(brut)}catch{}
  if(r.status===429){
    // v100.208 (16.10.2026, măsurat 12:21): `X-RateLimit-Lock` = ora deblocării (secunde Unix; azi 15:04, ~3 h) și FIECARE cerere din
    // timpul lacătului îl prelungește (+10 s). Răcirea = lacătul, nu 15 s — altfel colectorul + paginile îl țineau aprins la nesfârșit.
    const antet=Number(r.headers.get("retry-after"));
    const secunde=lacatDinRaspuns(r.headers,429,Number.isFinite(antet)&&antet>0?antet:RACIRE_MIN_S);   // audit 19.10: in lacatul comun
    const ora=secunde>120?` — blocat până la ${oraRo(lacatPanaLa())}`:"";
    throw Object.assign(Error("Pionex rate limit"+ora),{status:429,retryAfter:secunde});
  }
  lacatDinRaspuns(r.headers,r.status,0);   // audit 19.10: lacatul vine si pe alte refuzuri - tinut minte, nu doar la 429
  return {r,data,brut};
}
