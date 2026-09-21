import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const src=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
function extractFunction(name){
  const start=src.indexOf(`function ${name}(`);if(start<0)throw Error(`missing ${name}`);const body=src.indexOf('{',src.indexOf(')',start));let d=0,q=null,esc=false;
  for(let i=body;i<src.length;i++){const ch=src[i];if(esc){esc=false;continue}if(ch==='\\'){esc=true;continue}if(q){if(ch===q)q=null;continue}if(ch==='"'||ch==="'"||ch==='`'){q=ch;continue}if(ch==='{')d++;else if(ch==='}'){d--;if(d===0)return src.slice(start,i+1)}}throw Error(`unterminated ${name}`)
}
const fns=['prMarketOf','prRows','prStats','prPaperStats','prGate','prModelGate','profitMarketEvidence','profitReadinessSnapshot'];
const now=Date.now();
function pack(vals){let n=vals.length,sum=vals.reduce((a,b)=>a+b,0),gp=vals.filter(x=>x>0).reduce((a,b)=>a+b,0),gl=-vals.filter(x=>x<0).reduce((a,b)=>a+b,0),eq=0,peak=0,dd=0;for(const v of vals){eq+=v;peak=Math.max(peak,eq);dd=Math.min(dd,eq-peak)}return {n,avg:n?sum/n:0,pf:gl?gp/gl:gp?99:0,dd,win:n?vals.filter(x=>x>0).length/n:0}}
function makeResearch(n=180,days=60){const regimes=['TREND_UP','TREND_DOWN','RANGE','HIGH_VOL'],out=[];for(let i=0;i<n;i++){const r=i%7===0?-.18:i%11===0?-.08:.28+(i%5)*.015;out.push({id:`r${i}`,ts:now-days*86400000+i*(days*86400000/Math.max(1,n-1)),market:'CRYPTO',source:'BINANCE',tf:['15m','1h','4h','1d'][i%4],regime:regimes[i%4],r})}return out}
function makePaper(n=65){const out=[];for(let i=0;i<n;i++){const r=i%8===0?-.15:.22+(i%3)*.02;out.push({id:`p${i}`,created:now-35*86400000+i*(35*86400000/Math.max(1,n-1)),opened:now-35*86400000+i*(35*86400000/Math.max(1,n-1)),market:'CRYPTO',source:'BINANCE',qtyFilled:1,riskUsd:100,realizedUsd:r*100,status:'CLOSED'})}return out}
let RESEARCH=makeResearch(),PAPER=makePaper(),PROVIDER=true,OOS={ts:now-86400000,pass:true,n:34,avg:.19,pf:1.62,dd:-2.4},QUALITY=92;
const box={console,Math,Number,Array,Object,JSON,Date,Error,String,Map,Set,navigator:{onLine:true}};box.window=box;
box.assetClass=()=> 'CRYPTO';box.analysisSource=()=> 'BINANCE';box.researchJournalRows=()=>RESEARCH;box.chronologicalRows=a=>[...a].sort((x,y)=>(+x.ts||0)-(+y.ts||0));box.metricR=x=>Number.isFinite(+x.r)?+x.r:NaN;box.statPack=pack;box.canonicalRegime=x=>x.regime||'UNKNOWN';box.paperTrades=()=>PAPER;box.paperMigrateTrade=x=>x;box.paperTerminalStatus=x=>x.status==='CLOSED';box.forwardStart=()=>now-24*86400000;box.profitProviderVerified=()=>PROVIDER;box.currentProfitReadinessOos=()=>OOS;box.masterDataQuality=()=>QUALITY;box.$=()=>({value:''});box.stockSymbol=x=>x;box.norm=x=>x||'BTCUSDT';box.metaEnsembleV2={models:true,config:{maxDisagreement:.18}};box.ensembleCurrentPrediction=()=>({state:'USABLE ENSEMBLE',disagreement:.06});box.ensembleV2Config=()=>({maxDisagreement:.18});box.metaLabelState=null;box.driftSnapshot={state:'STABLE'};box.__radarState={market:'CRYPTO',source:'BINANCE',symbol:'BTCUSDT',tf:'4h',mode:'auto'};box.__masterVerdict={verdict:'WAIT'};
vm.createContext(box);vm.runInContext(fns.map(extractFunction).join('\n'),box,{filename:'readiness-extract.js'});
const live=box.profitReadinessSnapshot('CRYPTO','BINANCE');
if(live.state!=='SMALL LIVE READY')throw Error(`expected SMALL LIVE READY ${JSON.stringify({state:live.state,failed:live.liveGates.filter(x=>!x.pass)})}`);
if(live.liveGates.length!==18||live.paperGates.length!==6)throw Error(`gate counts ${live.liveGates.length}/${live.paperGates.length}`);
PROVIDER=false;const paper=box.profitReadinessSnapshot('CRYPTO','BINANCE');if(paper.state!=='PAPER READY')throw Error(`provider-only failure should retain PAPER READY: ${paper.state}`);
RESEARCH=makeResearch(16,4);PAPER=[];const notReady=box.profitReadinessSnapshot('CRYPTO','BINANCE');if(notReady.state!=='NOT READY')throw Error(`small sample should be NOT READY: ${notReady.state}`);
console.log(`V57_PROFIT_READINESS_PASS live=${live.state.replaceAll(' ','_')} paper=${paper.state.replaceAll(' ','_')} not=${notReady.state.replaceAll(' ','_')} live_gates=${live.liveGates.length} paper_gates=${live.paperGates.length}`);
