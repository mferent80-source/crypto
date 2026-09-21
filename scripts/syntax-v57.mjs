import {readdir,readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';

const root=path.resolve(new URL('..',import.meta.url).pathname);
const dirs=['public','functions','workers','scripts'];
const files=[];
async function walk(dir){for(const e of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory()){if(e.name!=='node_modules')await walk(p)}else if(/\.(?:js|mjs)$/.test(e.name))files.push(p)}}
for(const d of dirs)await walk(path.join(root,d));
let failed=[];
for(const f of files){const r=spawnSync(process.execPath,['--check',f],{encoding:'utf8'});if(r.status!==0)failed.push({file:path.relative(root,f),error:r.stderr||r.stdout})}
for(const j of ['package.json','public/manifest.webmanifest','public/_routes.json']){try{JSON.parse(await readFile(path.join(root,j),'utf8'))}catch(e){failed.push({file:j,error:e.message})}}
if(failed.length){console.error(JSON.stringify(failed,null,2));process.exit(1)}
console.log(`V57_SYNTAX_PASS ${files.length} executable JS/MJS surfaces + JSON manifests`);
