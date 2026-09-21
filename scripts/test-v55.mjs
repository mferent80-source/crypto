import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {onRequestGet as extGet} from '../functions/api/external-intel.js';

// 1) Exercise the research worker in a VM without browser dependencies.
const workerSrc=await readFile(new URL('../public/research-worker.js',import.meta.url),'utf8');
let posted=[];const sandbox={self:{postMessage:m=>posted.push(m)},Math,Number,Array,Object,JSON,Date,Error,String,Map,Set,console};vm.createContext(sandbox);vm.runInContext(workerSrc,sandbox,{filename:'research-worker.js'});
const train=[];for(let i=0;i<160;i++){const vals=Array.from({length:13},(_,j)=>.5+.35*Math.sin(i*.11+j*.37));const utility=2*(vals[0]-.5)+1.2*(vals[1]-.5)-.6*(vals[4]-.5);train.push({vals,label:utility>=.1?1:0,utility,weight:Math.max(.25,Math.min(3,Math.abs(utility)))})}
function workerCall(type,payload){posted=[];sandbox.self.onmessage({data:{id:1,type,payload}});const m=posted[0];if(!m?.ok)throw Error(`${type}: ${m?.error}`);return m.result}
const log=workerCall('trainLogistic',{train,l2:.02,epochs:240,lr:.06});if(!Array.isArray(log.w)||log.w.length!==14||!Number.isFinite(log.baseRate))throw Error('worker logistic');
const st=workerCall('trainStumps',{train,rounds:12,shrink:.2,minLeaf:7});if(!Array.isArray(st.stumps)||!st.stumps.length)throw Error('worker stumps');
const mc1=workerCall('monteCarlo',{vals:[1,-.5,.7,-.2],runs:250,trades:30,method:'BLOCK',block:3,seed:54});const mc2=workerCall('monteCarlo',{vals:[1,-.5,.7,-.2],runs:250,trades:30,method:'BLOCK',block:3,seed:54});if(JSON.stringify(mc1)!==JSON.stringify(mc2))throw Error('worker Monte Carlo not deterministic');

// 2) Exercise external historical CVD normalization: unsorted input must be sorted before accumulation.
globalThis.fetch=async url=>{url=String(url);if(url.includes('/api/spot/taker-buy-sell-volume/history'))return new Response(JSON.stringify({code:'0',data:[{time:3000,taker_buy_volume_usd:'90',taker_sell_volume_usd:'20'},{time:1000,taker_buy_volume_usd:'50',taker_sell_volume_usd:'20'},{time:2000,taker_buy_volume_usd:'40',taker_sell_volume_usd:'10'}]}),{status:200,headers:{'content-type':'application/json'}});return new Response('{}',{status:404})};
const env={APP_API_TOKEN:'x',COINGLASS_API_KEY:'cg'};const r=await extGet({request:new Request('https://app.test/api/external-intel?action=cvd&symbol=BTCUSDT&days=1&interval=1h',{headers:{authorization:'Bearer x'}}),env});const cvd=await r.json();if(r.status!==200||!cvd.available)throw Error(`CVD route ${r.status} ${JSON.stringify(cvd)}`);if(cvd.rows.map(x=>x.ts).join(',')!=='1000,2000,3000')throw Error('CVD not chronological');if(cvd.finalCvd!==130)throw Error(`CVD sum expected 130 got ${cvd.finalCvd}`);


// 3) Exercise actual app.js MTF coverage and conservative same-candle paths.
const appSrc=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
function extractFunction(src,name){
  const start=src.indexOf(`function ${name}(`);if(start<0)throw Error(`missing function ${name}`);const body=src.indexOf('{',src.indexOf(')',start));let depth=0;for(let i=body;i<src.length;i++){if(src[i]==='{')depth++;else if(src[i]==='}'){depth--;if(depth===0)return src.slice(start,i+1)}}throw Error(`unterminated ${name}`)
}
const appBox={Math,Number,Array,Object,JSON,Date,Error,String,Map,Set,console};appBox.clamp=(v,a=0,b=100)=>Math.max(a,Math.min(b,v));vm.createContext(appBox);
vm.runInContext([extractFunction(appSrc,'mtfComposite'),extractFunction(appSrc,'wfTrade'),extractFunction(appSrc,'paramWfTrade')].join('\n'),appBox,{filename:'app-extract.js'});
const one=appBox.mtfComposite([{tf:'4h',score:82}]);if(one.comp!=='NEUTRAL'||one.usable!==false||one.confidence>25)throw Error(`MTF one-TF overconfidence ${JSON.stringify(one)}`);
const three=appBox.mtfComposite([{tf:'15m',score:78},{tf:'1h',score:75},{tf:'4h',score:80}]);if(!three.usable||three.comp!=='BULLISH')throw Error(`MTF 3/4 gate ${JSON.stringify(three)}`);
const cfg={feeBps:0,slippageBps:0},point={score:80,atr:2,entry:100,future:[[1,100,107,95,100,1]]};const w=appBox.wfTrade([point],64,cfg,0,1);if(w.length!==1||w[0]!==-1)throw Error(`wf same-candle ${JSON.stringify(w)}`);if((w.ambiguityCount??1)!==1)throw Error(`wf ambiguity ${w.ambiguityCount}`);
const pw=appBox.paramWfTrade([point],{threshold:64,stopMult:1.5,targetR:2,costMult:1},cfg,0,1);if(pw.length!==1||pw[0]!==-1)throw Error(`param same-candle ${JSON.stringify(pw)}`);

console.log(`V55_RUNTIME_PASS worker_logistic=${log.w.length} stumps=${st.stumps.length} cvd=${cvd.finalCvd} mc_deterministic=1 mtf_one=${one.confidence}% same_candle=${w[0]}`);
