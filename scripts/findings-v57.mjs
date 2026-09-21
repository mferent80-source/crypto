import {readFile} from 'node:fs/promises';
const data=JSON.parse(await readFile(new URL('../AUDIT_V57_FINDINGS.json',import.meta.url),'utf8'));
if(data.findings.length!==62)throw Error(`Expected 62 findings, got ${data.findings.length}`);
const open=data.findings.filter(x=>x.status_v54==='OPEN');if(open.length)throw Error(`Open findings: ${open.map(x=>x.id).join(',')}`);
const high=data.findings.filter(x=>x.severity_v53==='HIGH');if(high.some(x=>!['FIXED','MITIGATED'].includes(x.status_v54)))throw Error('Unresolved HIGH finding');
const ids=new Set(data.findings.map(x=>x.id));if(ids.size!==62)throw Error('Duplicate finding IDs');
console.log(`V57_FINDINGS_MATRIX_PASS total=${data.findings.length} fixed=${data.counts.fixed} mitigated=${data.counts.mitigated} open=${data.counts.open}`);
