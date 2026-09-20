import {onRequestGet as accountGet} from '../functions/api/pionex-account.js';
import {onRequestGet as monitorGet,onRequestPost as monitorPost} from '../functions/api/monitor.js';
import {onRequestPost as pushPost} from '../functions/api/push.js';
import {onRequestGet as historyGet,onRequestPost as historyPost} from '../functions/api/history.js';
import {onRequestGet as stocksGet} from '../functions/api/stocks.js';
import {onRequestGet as intelGet} from '../functions/api/intel.js';
import {onRequestGet as extGet} from '../functions/api/external-intel.js';
import {onRequestGet as marketGet} from '../functions/api/market.js';
import monitorWorker from '../workers/radar-monitor.js';

const TOKEN='v54-test-secret';
const env={APP_API_TOKEN:TOKEN};
const req=(url,{token,origin,method='GET',body}={})=>new Request(url,{method,headers:{...(token?{authorization:`Bearer ${token}`}:{ }),...(origin?{origin}:{ }),'content-type':'application/json'},body:body==null?undefined:JSON.stringify(body)});
const status=async fn=>Number((await fn()).status);
const same='https://app.test';
const checks=[];
async function expect(name,got,want){checks.push([name,got,want]);if(got!==want)throw Error(`${name}: expected ${want}, got ${got}`)}

await expect('pionex account no token',await status(()=>accountGet({request:req(`${same}/api/pionex-account?action=status`),env})),401);
await expect('pionex account wrong token',await status(()=>accountGet({request:req(`${same}/api/pionex-account?action=status`,{token:'wrong'}),env})),401);
await expect('pionex account valid token',await status(()=>accountGet({request:req(`${same}/api/pionex-account?action=status`,{token:TOKEN}),env})),200);
await expect('monitor GET no token',await status(()=>monitorGet({request:req(`${same}/api/monitor`),env})),401);
await expect('monitor POST missing Origin',await status(()=>monitorPost({request:req(`${same}/api/monitor?action=run`,{token:TOKEN,method:'POST'}),env})),403);
await expect('push missing Origin',await status(()=>pushPost({request:req(`${same}/api/push?action=subscribe`,{token:TOKEN,method:'POST',body:{endpoint:'x',keys:{p256dh:'a',auth:'b'}}}),env})),403);
await expect('history GET no token',await status(()=>historyGet({request:req(`${same}/api/history?action=status`),env})),401);
await expect('history POST missing Origin',await status(()=>historyPost({request:req(`${same}/api/history?action=event`,{token:TOKEN,method:'POST',body:{}}),env})),403);
await expect('stocks paid route no token',await status(()=>stocksGet({request:req(`${same}/api/stocks?action=quote&symbol=AAPL`),env})),401);
await expect('intel route no token',await status(()=>intelGet({request:req(`${same}/api/intel?action=macro`),env})),401);
await expect('external paid route no token',await status(()=>extGet({request:req(`${same}/api/external-intel?action=calendar`),env})),401);
await expect('Pionex public proxy no token',await status(()=>marketGet({request:req(`${same}/api/market?type=pionex_symbols`),env})),401);
await expect('market health stays public',await status(()=>marketGet({request:req(`${same}/api/market?type=health`),env})),200);
await expect('stocks config stays public',await status(()=>stocksGet({request:req(`${same}/api/stocks?action=config`),env})),200);
await expect('external config stays public',await status(()=>extGet({request:req(`${same}/api/external-intel?action=config`),env})),200);

// Exercise the authenticated Pionex proxy with a D1-backed global pacing reservation.
{
  const originalFetch=globalThis.fetch;let sawUpdatedTs=false;
  const db={prepare(sql){if(sql.includes('monitor_state')){sawUpdatedTs=sql.includes('updated_ts')&&!sql.includes('updated_at');return {bind(){return {first:async()=>({value:String(Date.now()+1100)})}}}}throw Error('unexpected DB SQL')}};
  globalThis.fetch=async url=>new Response(JSON.stringify({result:true,data:{tickers:[]}}),{status:200,headers:{'content-type':'application/json'}});
  const r=await marketGet({request:req(`${same}/api/market?type=pionex_tickers`,{token:TOKEN}),env:{...env,DB:db}});
  if(r.status!==200||!sawUpdatedTs)throw Error(`Pionex D1 gate runtime failed status=${r.status} updated_ts=${sawUpdatedTs}`);
  checks.push(['Pionex D1 global gate uses updated_ts',200,200]);globalThis.fetch=originalFetch;
}
// Pages monitor status must use the server-side MONITOR_TOKEN when asking the private Worker health endpoint.
{
  const originalFetch=globalThis.fetch;let authHeader='';
  globalThis.fetch=async (url,opt={})=>{authHeader=new Headers(opt.headers||{}).get('authorization')||'';return new Response(JSON.stringify({ok:true,service:'crypto-radar-monitor'}),{status:200,headers:{'content-type':'application/json'}})};
  const r=await monitorGet({request:req(`${same}/api/monitor`,{token:TOKEN}),env:{...env,MONITOR_WORKER_URL:'https://monitor.test',MONITOR_TOKEN:'monitor-secret'}});
  const d=await r.json();if(r.status!==200||d.worker?.service!=='crypto-radar-monitor'||authHeader!=='Bearer monitor-secret')throw Error(`Monitor private health forwarding failed ${r.status} ${authHeader}`);
  checks.push(['monitor Pages proxy forwards private health token',200,200]);globalThis.fetch=originalFetch;
}
const publicHealth=await monitorWorker.fetch(new Request('https://monitor.test/health'),{MONITOR_TOKEN:TOKEN});const publicHealthBody=await publicHealth.json();if(JSON.stringify(publicHealthBody)!==JSON.stringify({ok:true}))throw Error(`monitor public health leaked detail ${JSON.stringify(publicHealthBody)}`);checks.push(['monitor public health minimal',200,200]);
const privateHealth=await monitorWorker.fetch(new Request('https://monitor.test/health',{headers:{authorization:`Bearer ${TOKEN}`}}),{MONITOR_TOKEN:TOKEN});const privateHealthBody=await privateHealth.json();if(privateHealthBody.service!=='crypto-radar-monitor')throw Error('monitor private health missing detail');checks.push(['monitor private health auth',200,200]);
console.log(`V54_SECURITY_RUNTIME_PASS ${checks.length} auth/origin/quota-gate checks`);
