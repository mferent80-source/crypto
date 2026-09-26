// Cererile PRIVATE catre Pionex (cele semnate cu cheia lui). STRICT READ-ONLY:
// aici se semneaza si se trimit doar GET-uri; caile le aleg rutele.
//
// De ce e un modul comun: pionex-account, bot-orders si provider-health folosesc
// ACEEASI cheie, deci aceeasi limita la Pionex. Cu cate o poarta de ritm in
// fiecare ruta, un 429 luat de una nu oprea celelalte, care loveau mai departe
// o cheie deja in racire. Acum e o singura poarta si o singura racire.
import {dupaCelDinFata} from "./poarta.js";
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
let poarta=Promise.resolve(),urmatorulLa=0,racePanaLa=0;
const asteapta=ms=>new Promise(r=>setTimeout(r,ms));
// v91.5: cererea din fata e asteptata cel mult cat poate dura ea legitim (vezi _shared/poarta.js)
const ASTEPTARE_MAX_MS=TIMEOUT_MS+2000;
function cuRitm(fn){
  const rulare=dupaCelDinFata(poarta,ASTEPTARE_MAX_MS).then(async()=>{
    const racire=Math.max(0,racePanaLa-Date.now());
    if(racire){
      const s=Math.ceil(racire/1000);
      throw Object.assign(Error(`Pionex rate limit: retry in ${s}s`),{status:429,retryAfter:s});
    }
    const intarziere=Math.max(0,urmatorulLa-Date.now());
    if(intarziere)await asteapta(intarziere);
    urmatorulLa=Date.now()+PAUZA_MS;
    return fn();
  });
  poarta=rulare.catch(()=>{});
  return rulare;
}
// Doar pentru probe: fiecare proba porneste fara racirea lasata de alta.
export function reseteazaRitmPionex(){poarta=Promise.resolve();urmatorulLa=0;racePanaLa=0}

// Intoarce {r, data, brut}. Singurul lucru decis aici e 429 (racirea e a cheii);
// restul formei o judeca ruta, fiindca fiecare stie ce asteapta.
export async function pionexPrivatGet(env,path,params={}){
  const apiKey=env.PIONEX_API_KEY,secret=env.PIONEX_API_SECRET;
  if(!apiKey||!secret)throw Object.assign(Error("Pionex read-only server secrets are not configured"),{status:503});
  const r=await cuRitm(async()=>{
    const all={...params,timestamp:Date.now()},query=sortedQuery(all),signature=await hmacHex(secret,`GET${path}?${query}`);
    return fetch(`${PIONEX}${path}?${query}`,{headers:{
      "accept":"application/json",
      "PIONEX-KEY":apiKey,
      "PIONEX-SIGNATURE":signature
    },signal:AbortSignal.timeout(TIMEOUT_MS)});
  }).catch(e=>{
    if(e?.status)throw e;
    const motiv=e?.name==="TimeoutError"||e?.name==="AbortError"?`fara raspuns in ${TIMEOUT_MS} ms`:String(e?.message||e);
    throw Object.assign(Error(`Pionex: ${motiv}`),{status:504});
  });
  const brut=await r.text();let data=null;try{data=JSON.parse(brut)}catch{}
  if(r.status===429){
    const antet=Number(r.headers.get("retry-after")),secunde=Number.isFinite(antet)&&antet>0?antet:RACIRE_MIN_S;
    racePanaLa=Math.max(racePanaLa,Date.now()+secunde*1000);
    throw Object.assign(Error("Pionex rate limit"),{status:429,retryAfter:secunde});
  }
  return {r,data,brut};
}
