import {readFile,access} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(new URL('..',import.meta.url).pathname),read=f=>readFile(path.join(root,f),'utf8');
const [app,index,css,sw,market,stocks,ext,worker,headers,monitor,wrangler,pkg,contract,history,auth,manifest]=await Promise.all(['public/app.js','public/index.html','public/app.css','public/sw.js','functions/api/market.js','functions/api/stocks.js','functions/api/external-intel.js','public/research-worker.js','public/_headers','workers/radar-monitor.js','wrangler.monitor.toml','package.json','public/engine-contract.json','functions/api/history.js','functions/_shared/auth.js','public/manifest.webmanifest'].map(read));
const checks=[
 ['v55 badge',index.includes('v55 · WIDE TERMINAL UI · AUDITED')],
 ['audit scope visible',index.includes('AUDIT: STATIC+RUNTIME · LIVE UNVERIFIED')&&index.includes('Audit scope')],
 ['manifest v55',JSON.parse(manifest).description.includes('v55 Wide Terminal UI')],
 ['CSP',headers.includes("default-src 'self'")&&headers.includes("object-src 'none'")],
 ['frontend split',index.includes('/app.js')&&index.includes('/app.css')&&!index.includes('<script>')],
 ['worker shell',sw.includes('/research-worker.js')],
 ['api network-only',sw.includes('url.pathname.startsWith("/api/")')],
 ['MTF coverage',app.includes('minCoverage=3/4')&&app.includes('agreement*coverage*100')],
 ['same-candle conservative',app.includes('if(sh&&th){ambiguityCount++;hit=-1')&&app.includes('if(sh&&th){hit=-1;break}')],
 ['historical CVD continuity',ext.includes('missingIntervals')&&ext.includes('rows=[...byTs.values()].sort')],
 ['liquidation 7d',app.includes('Date.now()-7*86400000')],
 ['exact label purge',app.includes('labelIntervalOf')&&app.includes('exactPurged')],
 ['utility ML label',app.includes('label=utility>=.10?1:0')],
 ['locked experiment holdout',app.includes('lockedHoldoutPct:15')&&app.includes('lockedHoldoutEvaluated:false')],
 ['multiple testing penalty',app.includes('BOOTSTRAP_DIFF_BONFERRONI')&&app.includes('adjustedP')],
 ['ML archive',app.includes('researchJournalArchive')&&app.includes('researchJournalRows')],
 ['stock split guard',stocks.includes('corporateActionGuard')&&stocks.includes('splitLikeDiscontinuity')],
 ['vol maturity match',app.includes('matchedDays')&&app.includes('vol54IvForDays')],
 ['vol paper opt-in',app.includes('enableExperimentalVolRisk')],
 ['full IDB backup',app.includes('localArchive')&&app.includes('crypto-radar-v55-full-backup.json')],
 ['snapshot aging',app.includes('referenceSnapshotState')&&app.includes('referenceDataGovernance')],
 ['Verdict progressive disclosure',index.includes('id="vcDetails"')&&index.includes('<details')],
 ['Pionex proxy auth',market.includes('pionex-public-proxy')&&market.includes('requireApiAuth')],
 ['Pionex global D1 gate schema',market.includes('monitor_state(key,value,updated_ts)')&&!market.includes('updated_at')],
 ['monitor private health forwarding',monitor.includes('authorization')&&monitor.includes('MONITOR_TOKEN')&&monitor.includes('/health')],
 ['monitor private detail',monitor.includes('MONITOR_TOKEN')&&monitor.includes('service:"crypto-radar-monitor"')],
 ['no wrangler placeholder',!wrangler.includes('REPLACE_WITH_')],
 ['test harness',pkg.includes('test:security')&&pkg.includes('test:runtime')],
 ['privacy session-only',app.includes('privacySessionState')&&app.includes('privacySessionOnly')&&app.includes('localDbMetaSet(key,value){\n  if(appSettings().privacySessionOnly)return false')],
 ['sample gates',app.includes('st.n>=20&&st.avg>bestAvg')&&app.includes('fs.n>=20&&fs.avg<=0')&&app.includes('exact.length>=30')],
 ['ATM proxy label',index.includes('Nearest ATM-band IV proxy')],
 ['escaped whale type',app.includes('escapeHtml(x.transactionType||"TRANSFER")')],
 ['D1 tenant isolation',history.includes('tenant=await tenantKey')&&history.includes('WHERE tenant=?')&&auth.includes('export async function tenantKey')],
 ['monitor public health minimal',monitor.includes('return json({ok:true})')&&monitor.includes('token===env.MONITOR_TOKEN')],
 ['engine contract inherited',JSON.parse(contract).version==='54.1'&&[app,worker,market,ext,monitor].every(x=>x.includes('ENGINE_CONTRACT_VERSION="54.1"'))],
 ['glossary',index.includes('Glosar research · RO/EN')],
 ['pinned runtime',pkg.includes('"node": "22.x"')&&pkg.includes('npm@10.9.2')],
 // v55 wide-terminal invariants
 ['no body 900 cap',!css.includes('body{font-family:system-ui;background:#0b1118;color:#e7eef7;max-width:900px')],
 ['desktop main uncapped',css.includes('main{width:100%;max-width:none!important;margin:0!important')],
 ['wide desktop grid',css.includes('.dashWideGrid{grid-template-columns:repeat(24,minmax(0,1fr))')],
 ['ultrawide grid',css.includes('@media(min-width:2200px)')&&css.includes('repeat(30,minmax(0,1fr))')],
 ['wide chart',css.includes('#chart{width:100%!important;height:430px!important')],
 ['desktop sidebar compact',css.includes(':root{--sidebar:205px;--topbar:56px}')],
 ['dashboard semantic classes',index.includes('dashWideGrid')&&index.includes('dashChart')&&index.includes('dashMarketContext')&&index.includes('dashOrderFlow')],
 ['mobile v54 preserved',css.includes('@media(max-width:980px)')&&css.includes('.sideNav{display:none}')],
 ['v55 app version',app.includes('const APP_VERSION="v55"')],
 ['v55 PWA cache',sw.includes('crypto-radar-v55')],
 ['v55 package',JSON.parse(pkg).version==='55.0.0']
];
const bad=checks.filter(x=>!x[1]);if(bad.length){console.error('V55_AUDIT_FAIL',bad.map(x=>x[0]).join(', '));process.exit(1)}
for(const f of ['package-lock.json','scripts/security-v55.mjs','scripts/test-v55.mjs','scripts/syntax-v55.mjs','scripts/findings-v55.mjs'])await access(path.join(root,f));
console.log(`V55_STATIC_AUDIT_PASS ${checks.length} hardening + wide-ui invariants`);
