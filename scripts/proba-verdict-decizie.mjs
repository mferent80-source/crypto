import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const src=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
function extractFunction(name){
  const start=src.indexOf(`function ${name}(`);if(start<0)throw Error(`missing ${name}`);const body=src.indexOf('{',src.indexOf(')',start));let d=0;for(let i=body;i<src.length;i++){if(src[i]==='{')d++;else if(src[i]==='}'){d--;if(d===0)return src.slice(start,i+1)}}throw Error(`unterminated ${name}`)
}
class El{constructor(tag='div'){this.tag=tag;this.textContent='';this.className='';this.children=[]}append(...x){this.children.push(...x)}appendChild(x){this.children.push(x);return x}replaceChildren(...x){this.children=[...x]}}
const ids=['decisionCall','decisionRiskState','decisionHeadline','decisionActionLine','decisionBaseBias','decisionAgreement','decisionCalibrated','decisionConsensus','decisionCoverage','decisionQuality','decisionWhyList','decisionAgainstList','decisionUnlockList','decisionTradePlan','decisionTradeNote'];
const els=Object.fromEntries(ids.map(id=>[id,new El()]));
const box={console,Math,Number,Array,Object,JSON,Date,Error,String,Map,Set,document:{createElement:t=>new El(t)}};
box.window=box;box.$=id=>els[id]||null;box.masterDataQuality=()=>92;box.buildVerdictCenterSnapshot=()=>box.__vc;box.calibrationV2State=null;box.num=v=>Number(v).toFixed(4);
vm.createContext(box);vm.runInContext(['veSetList','veModuleScore','veModuleText','renderVerdictExplainer'].map(extractFunction).join('\n'),box,{filename:'verdict-extract.js'});
box.__radarState={symbol:'BTCUSDT'};box.__signalState={tm:{direction:'SHORT',entryLow:100,entryHigh:102,stop:105,tp1:96,tp2:92}};
box.__vc={modules:[
 {name:'Trend composite',value:'28/100',available:true,directional:true,severity:null,bias:-.72,weight:.055},
 {name:'True recent trade-flow CVD',value:'SELL DOMINANT -18%',available:true,directional:true,severity:null,bias:-.52,weight:.055},
 {name:'Momentum composite',value:'67/100',available:true,directional:true,severity:null,bias:.34,weight:.045},
 {name:'Economic calendar',value:'BLACKOUT',available:true,directional:false,severity:'BLOCK',bias:NaN,weight:0}
],agreement:67,coverage:88,weightedBias:-.31,conviction:31,consensus:'BEARISH'};
const gates=[{code:'MACRO_BLACKOUT',why:'blackout',unlock:'Așteaptă ieșirea din blackout.'}];
const out=box.renderVerdictExplainer({verdict:'WAIT',dir:-1,quality:92,cal:{p:.64},gates,vc:box.__vc});
if(out.base!=='SHORT'||out.riskState!=='BLOCAT · 1')throw Error(JSON.stringify(out));
if(!els.decisionHeadline.textContent.includes('Bias de bază SHORT'))throw Error('headline not explicit');
if(!els.decisionActionLine.textContent.includes('STAI PE MARGINE'))throw Error('WAIT action not explicit');
if(els.decisionCalibrated.textContent!=='SHORT 64%')throw Error(`cal=${els.decisionCalibrated.textContent}`);
if(!els.decisionWhyList.children.length||!els.decisionAgainstList.children.length||!els.decisionUnlockList.children.length)throw Error('lists missing');
if(!els.decisionTradePlan.textContent.includes('INACTIV'))throw Error(`plan=${els.decisionTradePlan.textContent}`);
console.log(`V57_VERDICT_EXPLAINER_PASS base=${out.base} risk=${out.riskState.replaceAll(' ','_')} agreement=${out.agreement}% support=${out.support.length} opposition=${out.opposition.length}`);
