const localBuckets=new Map();
const enc=new TextEncoder();

async function digest(s){return new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(String(s||''))))}
function equalBytes(a,b){if(a.length!==b.length)return false;let x=0;for(let i=0;i<a.length;i++)x|=a[i]^b[i];return x===0}
export async function tokenValid(request,env){
  const expected=String(env.APP_API_TOKEN||'');if(!expected)return {ok:false,reason:'APP_API_TOKEN_NOT_CONFIGURED'};
  const h=request.headers.get('authorization')||'',bearer=h.startsWith('Bearer ')?h.slice(7).trim():request.headers.get('x-app-token')||'';
  if(!bearer)return {ok:false,reason:'AUTH_REQUIRED'};
  const [a,b]=await Promise.all([digest(bearer),digest(expected)]);return {ok:equalBytes(a,b),reason:equalBytes(a,b)?null:'AUTH_INVALID'}
}

function hex(bytes){return [...bytes].map(b=>b.toString(16).padStart(2,'0')).join('')}
export async function tenantKey(request,env){
  const explicit=String(env.HISTORY_TENANT||'').trim().replace(/[^A-Za-z0-9._-]/g,'').slice(0,40);if(explicit)return explicit;
  const h=request.headers.get('authorization')||'',token=h.startsWith('Bearer ')?h.slice(7).trim():request.headers.get('x-app-token')||'';if(!token)return 'anonymous';return 'app_'+hex(await digest(token)).slice(0,20)
}
export function sameOrigin(request){const u=new URL(request.url),origin=request.headers.get('origin');return !!origin&&origin===u.origin}
function ipOf(request){return request.headers.get('cf-connecting-ip')||request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown'}
export async function rateLimit(request,env,scope='api',limit=90,windowSec=60){
  const now=Math.floor(Date.now()/1000),bucket=Math.floor(now/windowSec),key=`rl:${scope}:${ipOf(request)}:${bucket}`;
  if(env.API_RATE_LIMIT?.get&&env.API_RATE_LIMIT?.put){let n=Number(await env.API_RATE_LIMIT.get(key)||0)+1;await env.API_RATE_LIMIT.put(key,String(n),{expirationTtl:Math.max(60,windowSec+15)});return {ok:n<=limit,count:n,limit,retryAfter:(bucket+1)*windowSec-now}}
  const prior=localBuckets.get(key)||0,n=prior+1;localBuckets.set(key,n);if(localBuckets.size>5000){for(const k of localBuckets.keys()){const b=Number(k.split(':').at(-1));if(b<bucket-2)localBuckets.delete(k)}}return {ok:n<=limit,count:n,limit,retryAfter:(bucket+1)*windowSec-now}
}
// Incercarile GRESITE (token prezentat, dar gresit) se numara pe IP: peste 10 pe minut,
// IP-ul primeste 429 INAINTE ca tokenul sa mai fie verificat, deci ghicitul se opreste.
// Cererile fara token nu se numara: nu ghicesc nimic, si aplicatia fara token nu se incuie.
//
// Runda 1: numaratoarea se citea inainte de verificare si crestea dupa un `await`, asa ca
// cererile SIMULTANE treceau toate. Acum, in memoria izolatului, citirea contorului,
// verificarea tokenului si cresterea contorului se fac in ACELASI pas sincron, inainte de
// primul `await` - nicio alta cerere nu se poate strecura intre ele. Verificarea e
// sincrona (comparatie in timp constant pe octeti), deci tokenul BUN nu ocupa loc in
// contor nici macar o clipa: 20 de cereri bune simultane trec toate.
// Pe KV (intre izolate) get+put NU e atomic: acolo limita e doar aproximativa - cereri
// simultane pe izolate diferite pot citi aceeasi valoare. Contorul din memorie ramane
// garda exacta in interiorul fiecarui izolat.
const AUTH_FAIL_MAX=10,AUTH_FAIL_FEREASTRA=60;
function tokenDin(request){const h=request.headers.get('authorization')||'';return h.startsWith('Bearer ')?h.slice(7).trim():request.headers.get('x-app-token')||''}
function egalInTimpConstant(a,b){const x=enc.encode(String(a)),y=enc.encode(String(b)),n=Math.max(x.length,y.length);let d=x.length^y.length;for(let i=0;i<n;i++)d|=(x[i]??0)^(y[i]??0);return d===0}
export async function requireApiAuth(request,env,scope='api',limit=90){
  const expected=String(env.APP_API_TOKEN||'');if(!expected)return {ok:false,status:503,error:'APP_API_TOKEN_NOT_CONFIGURED'};
  const now=Math.floor(Date.now()/1000),bucket=Math.floor(now/AUTH_FAIL_FEREASTRA),key=`auth-fail:${ipOf(request)}:${bucket}`,retryAfter=(bucket+1)*AUTH_FAIL_FEREASTRA-now;
  const blocat={ok:false,status:429,error:'AUTH_RATE_LIMITED',retryAfter};
  // --- pas sincron: nimic de aici pana la primul await nu cedeaza controlul ---
  const n=localBuckets.get(key)||0;if(n>=AUTH_FAIL_MAX)return blocat;
  const token=tokenDin(request),bun=!!token&&egalInTimpConstant(token,expected);
  if(token&&!bun)localBuckets.set(key,n+1);
  // --- sfarsitul pasului sincron ---
  const kv=env.API_RATE_LIMIT?.get&&env.API_RATE_LIMIT?.put?env.API_RATE_LIMIT:null;
  if(kv){const m=Number(await kv.get(key)||0);if(m>=AUTH_FAIL_MAX)return blocat;if(token&&!bun)await kv.put(key,String(m+1),{expirationTtl:AUTH_FAIL_FEREASTRA+15})}
  if(!token)return {ok:false,status:401,error:'AUTH_REQUIRED'};
  if(!bun)return {ok:false,status:401,error:'AUTH_INVALID'};
  const rl=await rateLimit(request,env,scope,limit,60);if(!rl.ok)return {ok:false,status:429,error:'RATE_LIMITED',retryAfter:rl.retryAfter};return {ok:true}
}
export function authErrorResponse(result,headers={'content-type':'application/json','cache-control':'no-store'}){const h={...headers};if(result.retryAfter)h['retry-after']=String(result.retryAfter);return new Response(JSON.stringify({error:result.error,authenticated:false}),{status:result.status||401,headers:h})}
