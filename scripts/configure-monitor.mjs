import fs from 'node:fs';
const d1=process.env.D1_DATABASE_ID||'';
const kv=process.env.PUSH_KV_NAMESPACE_ID||'';
if(!/^[0-9a-f-]{20,}$/i.test(d1))throw new Error('D1_DATABASE_ID is required and must be a real Cloudflare D1 database id.');
if(!/^[0-9a-f]{20,}$/i.test(kv))throw new Error('PUSH_KV_NAMESPACE_ID is required and must be a real Cloudflare KV namespace id.');
const base=fs.readFileSync(new URL('../wrangler.monitor.toml',import.meta.url),'utf8');
const extra=`\n[[d1_databases]]\nbinding = "DB"\ndatabase_name = "crypto-radar-history"\ndatabase_id = "${d1}"\n\n[[kv_namespaces]]\nbinding = "PUSH_SUBSCRIPTIONS"\nid = "${kv}"\n`;
fs.writeFileSync(new URL('../wrangler.monitor.generated.toml',import.meta.url),base+extra);
console.log('Generated wrangler.monitor.generated.toml with validated bindings.');
