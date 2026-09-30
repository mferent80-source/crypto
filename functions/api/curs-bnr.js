// v100.28 (30.09, el: „fa idei”): cursul BNR pe zile, pentru Declaratia Unica - Pionex e in USDT, contabilul vrea lei la cursul
// din ziua fiecarei inchideri. Sursa: fisierul anual BNR, curs.bnr.ro/files/xml/years/nbrfxrates<an>.xml (adresa veche
// www.bnr.ro/files/xml/years/... da 404 la 30.09.2026). Tinut in memorie: anul curent 6 ore (se adauga o zi pe zi), anii trecuti 7 zile.
import {requireApiAuth,authErrorResponse} from "../_shared/auth.js";

const H={"content-type":"application/json","cache-control":"no-store"};
const json=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:H});
const tinute=new Map();

// { "AAAA-LL-ZZ": curs } pentru moneda ceruta; multiplicatorul BNR (ex. HUF la 100) e impartit
export function cursDinXml(xml,moneda="USD"){
  const out={};if(typeof xml!=="string")return out;
  const re=/<Cube date="(\d{4}-\d{2}-\d{2})">([\s\S]*?)<\/Cube>/g,rr=new RegExp(`<Rate currency="${moneda}"(?: multiplier="(\\d+)")?>([\\d.]+)</Rate>`);
  for(const m of xml.matchAll(re)){const r=m[2].match(rr);if(!r)continue;const v=Number(r[2])/(Number(r[1])||1);if(Number.isFinite(v)&&v>0)out[m[1]]=Math.round(v*1e8)/1e8}
  return out;
}

export async function onRequestGet({request,env}){
  const auth=await requireApiAuth(request,env,"curs-bnr",30);if(!auth.ok)return authErrorResponse(auth,H);
  const an=Number(new URL(request.url).searchParams.get("an")),acum=new Date().getUTCFullYear();
  if(!Number.isInteger(an)||an<2015||an>acum)return json({error:"Anul lipseste sau e gresit (2015–"+acum+")"},400);
  const t=tinute.get(an),ttl=an===acum?6*3600000:7*86400000;
  if(t&&Date.now()-t.la<ttl)return json(t.corp);
  let r;
  try{r=await fetch(`https://curs.bnr.ro/files/xml/years/nbrfxrates${an}.xml`,{headers:{accept:"application/xml,text/xml"},signal:AbortSignal.timeout(15000)})}
  catch(e){return json({error:"BNR nu raspunde: "+String(e&&e.message||e).slice(0,120)},502)}
  if(!r.ok)return json({error:"BNR: HTTP "+r.status},502);
  const curs=cursDinXml(await r.text(),"USD"),zile=Object.keys(curs).length;
  if(!zile)return json({error:"BNR: fisierul anului nu are cursul USD (forma necunoscuta)"},502);
  const corp={an,moneda:"USD",zile,curs,sursa:"BNR (curs.bnr.ro)"};
  tinute.set(an,{la:Date.now(),corp});
  return json(corp);
}
