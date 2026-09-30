// v100.25 (30.09, el: „FA IDEILE” - ideea 2): arhiva botilor INCHISI Pionex, pastrata de colector in KV-ul de acasa.
// Pionex da istoria pe PAGINI de cate 10 (limit e ignorat; cursorul e nextPageToken): la 30.09.2026 erau 2253 de boti
// inchisi din 12.2025, nu „doar ultimii 10”. Aici: forma compacta (doar ce citeste Jurnalul: ~0,5 KB pe bot fata de
// ~3,6 KB brut; fara userId/keyId) si unirea fara dubluri. O folosesc si serverul (istoric-bot), si colectorul.
export const CAMPURI_ARHIVA=["totalRealizedProfit","gridProfit","totalFee","totalFundingFee","usdtInvestment","leverage","trend","bottom","top","row","gridType","initPrice","closedPrice","lossStop"];
export const ARHIVA_MAX=20000;
// numerele Pionex vin ca siruri: se pastreaza asa (Jurnalul le citeste cu nr()); orice altceva cade
const val=v=>typeof v==="string"?v.slice(0,40):typeof v==="number"&&Number.isFinite(v)?v:null;
export const idArhiva=b=>String(b&&(b.strategyId||b.buOrderId)||"").replace(/[^A-Za-z0-9_-]/g,"").slice(0,64);

export function compactBot(b){
  if(!b||typeof b!=="object")return null;
  const id=idArhiva(b),porn=Number(b.createTime),inch=Number(b.closeTime);
  if(!id||!(porn>0)||!(inch>0))return null;
  const d=b.buOrderData&&typeof b.buOrderData==="object"?b.buOrderData:{},o={};
  for(const k of CAMPURI_ARHIVA){const v=val(d[k]);if(v!==null&&v!=="")o[k]=v}
  return {strategyId:id,base:String(b.base||"").slice(0,32),buOrderType:String(b.buOrderType||"").slice(0,24),createTime:porn,closeTime:inch,buOrderData:o};
}

// cel venit mai tarziu castiga (datele Pionex ale aceluiasi bot inchis nu se mai schimba, dar ultima citire e cea buna)
export function uneste(vechi,noi){
  const m=new Map();
  for(const x of [...(Array.isArray(vechi)?vechi:[]),...(Array.isArray(noi)?noi:[])]){const c=compactBot(x);if(c)m.set(c.strategyId,c)}
  return [...m.values()].sort((a,b)=>b.closeTime-a.closeTime).slice(0,ARHIVA_MAX);
}
