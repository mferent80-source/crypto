const localBuckets=new Map();
const enc=new TextEncoder();

async function digest(s){return new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(String(s||''))))}
// audit 19.10: verificarea veche a tokenului (si comparatia ei pe octeti) scoase - nu le mai chema nimic; verificarea e in requireApiAuth

function hex(bytes){return [...bytes].map(b=>b.toString(16).padStart(2,'0')).join('')}
export async function tenantKey(request,env){
  const explicit=String(env.HISTORY_TENANT||'').trim().replace(/[^A-Za-z0-9._-]/g,'').slice(0,40);if(explicit)return explicit;
  const h=request.headers.get('authorization')||'',token=h.startsWith('Bearer ')?h.slice(7).trim():request.headers.get('x-app-token')||'';if(!token)return 'anonymous';return 'app_'+hex(await digest(token)).slice(0,20)
}
export function sameOrigin(request){const u=new URL(request.url),origin=request.headers.get('origin');return !!origin&&origin===u.origin}
// v100.175 (auditul Opus, M13): primul IP din x-forwarded-for îl scrie clientul (fiecare ghicire putea veni cu alt „IP”); proxy-ul de acasă
// (Tailscale serve) ADAUGĂ IP-ul real la capăt ⇒ se ia ultimul. Fără antet (colectorul, local) rămâne „unknown”, ca înainte.
// v100.177 (revizia, I4): pe Cloudflare (cf-ray prezent) CF-Connecting-IP e al Cloudflare; acasă (wrangler) îl poate trimite clientul însuși
// v100.196 (auditul sever, 🔵1): x-forwarded-for ÎNAINTE de cf-connecting-ip - prin Tailscale un client își punea singur cf-connecting-ip + cf-ray și
// alegea alt „IP” la fiecare ghicire. Ultimul din listă îl adaugă proxy-ul (Tailscale serve acasă; pe Cloudflare tot el = CF-Connecting-IP).
// Fără antet (direct pe 127.0.0.1: colectorul, browserul de pe PC): IP-ul pus de wrangler sau „unknown”.
function ipOf(request){const l=String(request.headers.get('x-forwarded-for')||'').split(',').map(s=>s.trim()).filter(Boolean);if(l.length)return l[l.length-1];return request.headers.get('cf-connecting-ip')||'unknown'}
export async function rateLimit(request,env,scope='api',limit=90,windowSec=60){
  const now=Math.floor(Date.now()/1000),bucket=Math.floor(now/windowSec),key=`rl:${scope}:${ipOf(request)}:${bucket}`;
  if(env.API_RATE_LIMIT?.get&&env.API_RATE_LIMIT?.put){let n=Number(await env.API_RATE_LIMIT.get(key)||0)+1;await env.API_RATE_LIMIT.put(key,String(n),{expirationTtl:Math.max(60,windowSec+15)});return {ok:n<=limit,count:n,limit,retryAfter:(bucket+1)*windowSec-now}}
  const prior=localBuckets.get(key)||0,n=prior+1;localBuckets.set(key,n);if(localBuckets.size>5000){for(const k of localBuckets.keys()){const b=Number(k.split(':').at(-1));if(b<bucket-2)localBuckets.delete(k)}}return {ok:n<=limit,count:n,limit,retryAfter:(bucket+1)*windowSec-now}
}
// Incercarile GRESITE (token prezentat, dar gresit) se numara pe IP: peste 10 pe minut,
// IP-ul primeste 429 la orice token GRESIT, deci ghicitul se opreste.
// v100.196 (auditul sever, 🟡 S1): acasa browserul de pe PC si colectorul au aceeasi cheie de IP - un tab ramas cu parola veche
// incuia si colectorul (429), iar alertele taceau. Acum tokenul BUN trece peste blocare DOAR la cererile LOCALE directe (fara
// x-forwarded-for si fara cf-ray: pe 127.0.0.1 ajung doar programele PC-ului). Din retea (Tailscale, Cloudflare, tunel) blocarea
// tine si pentru tokenul bun: altfel 429 = gresit / 200 = corect ar fi un oracol, iar frana n-ar mai frana nimic (revizia de securitate).
// Contorul numara pe AMBELE chei (ultimul x-forwarded-for si cf-connecting-ip): un client nu scapa schimbandu-si unul dintre ele.
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
function cheiAuth(request){const l=String(request.headers.get('x-forwarded-for')||'').split(',').map(s=>s.trim()).filter(Boolean),cf=request.headers.get('cf-connecting-ip'),k=[];if(l.length)k.push(l[l.length-1]);if(cf&&!k.includes(cf))k.push(cf);return k.length?k:['unknown']}
function directLocal(request){return !request.headers.get('x-forwarded-for')&&!request.headers.get('cf-ray')}
function tokenDin(request){const h=request.headers.get('authorization')||'';return h.startsWith('Bearer ')?h.slice(7).trim():request.headers.get('x-app-token')||''}
function egalInTimpConstant(a,b){const x=enc.encode(String(a)),y=enc.encode(String(b)),n=Math.max(x.length,y.length);let d=x.length^y.length;for(let i=0;i<n;i++)d|=(x[i]??0)^(y[i]??0);return d===0}
export async function requireApiAuth(request,env,scope='api',limit=90,colectorLimit=0){
  const expected=String(env.APP_API_TOKEN||'');if(!expected)return {ok:false,status:503,error:'APP_API_TOKEN_NOT_CONFIGURED'};
  const now=Math.floor(Date.now()/1000),bucket=Math.floor(now/AUTH_FAIL_FEREASTRA),chei=cheiAuth(request).map(ip=>`auth-fail:${ip}:${bucket}`),retryAfter=(bucket+1)*AUTH_FAIL_FEREASTRA-now;
  const blocat={ok:false,status:429,error:'AUTH_RATE_LIMITED',retryAfter};
  // --- pas sincron: nimic de aici pana la primul await nu cedeaza controlul ---
  const token=tokenDin(request),bun=!!token&&egalInTimpConstant(token,expected),trece=bun&&directLocal(request);
  const n=Math.max(...chei.map(k=>localBuckets.get(k)||0));if(n>=AUTH_FAIL_MAX&&!trece)return blocat;
  if(token&&!bun)for(const k of chei)localBuckets.set(k,(localBuckets.get(k)||0)+1);
  // --- sfarsitul pasului sincron ---
  const kv=env.API_RATE_LIMIT?.get&&env.API_RATE_LIMIT?.put?env.API_RATE_LIMIT:null;
  if(kv&&!trece){const v=await Promise.all(chei.map(k=>kv.get(k))),m=Math.max(...v.map(x=>Number(x||0)));if(m>=AUTH_FAIL_MAX)return blocat;if(token&&!bun)for(let i=0;i<chei.length;i++)await kv.put(chei[i],String(Number(v[i]||0)+1),{expirationTtl:AUTH_FAIL_FEREASTRA+15})}
  if(!token)return {ok:false,status:401,error:'AUTH_REQUIRED'};
  if(!bun)return {ok:false,status:401,error:'AUTH_INVALID'};
  // v100.60 (el, 01.10): colectorul (antetul lui, verificat DUPA token) are galeata lui - pagina si colectorul nu-si mai fura limita.
  // Revizia 01.10 (I3): mai mare DOAR unde ruta o cere (colectorLimit, ex. citirile istoricului); Pionex/T212/Binance raman cu frana lor
  const col=request.headers.get('x-radar-client')==='colector';
  const rl=await rateLimit(request,env,col?scope+':colector':scope,col&&colectorLimit>0?colectorLimit:limit,60);if(!rl.ok)return {ok:false,status:429,error:'RATE_LIMITED',retryAfter:rl.retryAfter};return {ok:true}
}
export function authErrorResponse(result,headers={'content-type':'application/json','cache-control':'no-store'}){const h={...headers};if(result.retryAfter)h['retry-after']=String(result.retryAfter);return new Response(JSON.stringify({error:result.error,authenticated:false}),{status:result.status||401,headers:h})}
