import {readFile,access} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(new URL('..',import.meta.url).pathname),read=f=>readFile(path.join(root,f),'utf8');
const [app,index,css,sw,market,stocks,ext,worker,headers,monitor,wrangler,pkg,contract,history,auth,manifest,build]=await Promise.all(['public/app.js','public/index.html','public/app.css','public/sw.js','functions/api/market.js','functions/api/stocks.js','functions/api/external-intel.js','public/research-worker.js','public/_headers','workers/radar-monitor.js','wrangler.monitor.toml','package.json','public/engine-contract.json','functions/api/history.js','functions/_shared/auth.js','public/manifest.webmanifest','BUILD_INFO.json'].map(read));
const checks=[
 ['v57 badge',index.includes('v57 · PROFIT READINESS GATE · AUDITED')],
 ['audit scope visible',index.includes('AUDIT: STATIC+RUNTIME · LIVE UNVERIFIED')],
 ['manifest v57',JSON.parse(manifest).description.includes('v57 Profit Readiness Gate')],
 ['CSP',headers.includes("default-src 'self'")&&headers.includes("object-src 'none'")],
 ['frontend split',index.includes('/app.js')&&index.includes('/app.css')&&!index.includes('<script>')],
 ['api network-only',sw.includes('url.pathname.startsWith("/api/")')||sw.includes("url.pathname.startsWith('/api/')")],
 ['engine contract 54.1',JSON.parse(contract).version==='54.1'&&[app,worker,market,ext,monitor].every(x=>x.includes('ENGINE_CONTRACT_VERSION="54.1"'))],
 ['MTF coverage inherited',app.includes('minCoverage=3/4')&&app.includes('agreement*coverage*100')],
 ['same-candle conservative inherited',app.includes('if(sh&&th){ambiguityCount++;hit=-1')&&app.includes('if(sh&&th){hit=-1;break}')],
 ['CVD continuity inherited',ext.includes('missingIntervals')&&ext.includes('rows=[...byTs.values()].sort')],
 ['state isolation inherited',app.includes('requestIdentityStillCurrent')&&app.includes('invalidateDecisionContext')],
 ['provider auth inherited',market.includes('requireApiAuth')&&auth.includes('APP_API_TOKEN')],
 ['wide UI retained',css.includes('.dashWideGrid{grid-template-columns:repeat(24,minmax(0,1fr))')&&css.includes('@media(min-width:2200px)')],
 ['mobile retained',css.includes('@media(max-width:980px)')&&css.includes('.sideNav{display:none}')],
 ['verdict explainer retained',index.includes('Master Verdict · Ce fac acum?')&&app.includes('function renderVerdictExplainer(ctx={})')],
 ['v57 app version',app.includes('const APP_VERSION="v57"')],
 ['v57 PWA cache',sw.includes('crypto-radar-v57')],
 ['v57 package',JSON.parse(pkg).version==='57.0.0'],
 ['v57 build info',JSON.parse(build).version==='v57'],
 ['readiness dashboard',index.includes('id="prDashState"')&&index.includes('id="prDashCoverage"')&&index.includes('id="prDashNext"')],
 ['readiness full panel',index.includes('id="profitready"')&&index.includes('id="prPaperGates"')&&index.includes('id="prLiveGates"')],
 ['readiness classification',app.includes('livePass?"SMALL LIVE READY":paperPass?"PAPER READY":"NOT READY"')],
 ['paper threshold policy',app.includes('stats.n>=40')&&app.includes('stats.pf>=1.10')&&app.includes('stats.spanDays>=7')],
 ['small-live threshold policy',app.includes('stats.n>=150')&&app.includes('stats.avg>=.10')&&app.includes('stats.pf>=1.25')&&app.includes('forward.n>=60')&&app.includes('paper.n>=50')],
 ['strict evidence gates',app.includes('stats.regimeN>=3')&&app.includes('oosPass')&&app.includes('model.usable')&&app.includes('quality>=80')&&app.includes('providerVerified&&online')],
 ['not profit guarantee',index.includes('NOT A PROFIT GUARANTEE')&&index.includes('Readiness ≠ expected profit')&&app.includes('profit is still not predicted')],
 ['current trade separated',app.includes('A current trade still requires its own Master Verdict and risk limits.')],
 ['manual provider confirmation',index.includes('I manually confirmed live provider/data behavior after deployment.')&&app.includes('profitProviderVerified')],
 ['checkbox delegated action supported',app.includes('t==="this.checked"')&&index.includes('setProfitProviderVerified(this.checked)')],
 ['OOS readiness archive',app.includes('saveProfitReadinessOos')&&app.includes('oos.n>=20&&oos.avg>0&&oos.pf>=1.2')],
 ['readiness persistence',app.includes('localDbPutRecord("profit_readiness"')&&app.includes('["profit_readiness","localProfitReadiness"]')],
 ['readiness report',app.includes('profitReadiness:{count:readinessRows.length')&&app.includes('profitReadiness=(await localDbRecords("profit_readiness"')],
 ['readiness backup',app.includes('profitReadiness:{prefs:prPrefStore(),oos:prOosStore()')],
 ['privacy readiness storage',app.includes('sessionStorage.setItem(PROFIT_READY_PREF_KEY')&&app.includes('sessionStorage.setItem(PROFIT_READY_OOS_KEY')],
 ['market evidence compare',index.includes('Crypto vs Nasdaq / US Stocks evidence')&&app.includes('profitMarketEvidence("CRYPTO",null)')&&app.includes('profitMarketEvidence("STOCKS","TWELVEDATA")')],
 ['readiness navigation',index.includes("navTo('profitready')")&&app.includes('["Profit Readiness","profitready"]')],
 ['readiness CSS responsive',css.includes('.prGateDash')&&css.includes('.prColumns')&&css.includes('@media(max-width:980px)')],
 ['schema deliberately unchanged',app.includes('schemaVersion:54')&&JSON.parse(build).dataSchema===54],
 ['test harness readiness',JSON.parse(pkg).scripts['test:readiness']==='node scripts/readiness-v57.mjs']
];
const bad=checks.filter(x=>!x[1]);if(bad.length){console.error('V57_AUDIT_FAIL',bad.map(x=>x[0]).join(', '));process.exit(1)}
for(const f of ['package-lock.json','scripts/security-v57.mjs','scripts/test-v57.mjs','scripts/syntax-v57.mjs','scripts/findings-v57.mjs','scripts/verdict-v57.mjs','scripts/readiness-v57.mjs'])await access(path.join(root,f));
console.log(`V57_STATIC_AUDIT_PASS ${checks.length} hardening + wide-ui + verdict + readiness invariants`);
