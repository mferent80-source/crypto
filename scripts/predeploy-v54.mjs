import {readFile} from 'node:fs/promises';
const routes=JSON.parse(await readFile(new URL('../public/_routes.json',import.meta.url),'utf8'));
if(!routes.include?.includes('/api/*'))throw Error('Cloudflare Pages _routes.json must include /api/*');
const h=await readFile(new URL('../public/_headers',import.meta.url),'utf8');if(!h.includes('Content-Security-Policy'))throw Error('CSP missing');
console.log('V54_PREDEPLOY_PASS · configure APP_API_TOKEN in Cloudflare before using protected API features');
