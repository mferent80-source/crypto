// Avertismentele serverului pentru un bot (v100.62, specul „sfaturi concise”, pachetul 2): scoase din functions/api/bot-orders.js
// intr-o functie pura, ca garda textelor (scripts/garda-texte.mjs) sa le poata genera si verifica - aceleasi conditii; textele, scrise concis la v100.62.
// o = { x: buOrderData, pret, jos, sus, lich: { pretLichidare, lichidarePartea, distantaLichidarePct, lichidareDepasita }, comisioane, gridProfitBrut, profitNet }
const nr=v=>{
  if(typeof v==="number")return Number.isFinite(v)?v:null;
  if(typeof v!=="string"||!v.trim())return null;
  const x=Number(v);return Number.isFinite(x)?x:null;
};
const toate=(...a)=>a.every(x=>x!==null);
const virgula=s=>String(s).replace(".",",");
// suma cu semn si virgula („+10,91”, „−0,0040”), ca TextRo.usdt (TextRo e doar in pagina si in colector)
// v100.314 (el, 08.11): rezultatele cu O zecimală („+2,5”), sub 0,095 două, sub un cent patru (ca să nu iasă „0,0”)
const usdt=v=>{const a=Math.abs(v),s=a.toFixed(a>=0.095?1:a>=0.0095?2:a>0?4:1);return (Number(s)===0?"":v<0?"−":"+")+virgula(s)};
// revizia Opus a 2b (5): fara exponent („1.234e-7”) - sub 0,000001 cu toFixed, ~5 cifre semnificative, fara zerourile de la coada
const faraExp=v=>{if(typeof v!=="number"||!Number.isFinite(v))return String(v);const s=String(v);if(!/e/i.test(s))return s;const a=Math.abs(v);return a===0?"0":v.toFixed(Math.min(20,4-Math.floor(Math.log10(a)))).replace(/0+$/,"").replace(/\.$/,"")};
// pretul calculat (lichidarea estimata): ~5 cifre semnificative, ca preturile Pionex; peste 1000, 2 zecimale
const pretScurt=v=>v===null||v===undefined||!Number.isFinite(v)?"—":Math.abs(v)>=1000?v.toFixed(2):faraExp(Number(v.toPrecision(5)));

// v100.330 (auditul 12.11): taxa de intrare (cumpărarea de la pornire, plătită O DATĂ) - aceeași socoteală ca TabloExtra.taxaIntrare
// (paritatea: scripts/proba-v100330-sfaturi.mjs): investiția × levierul × partea din grid pe care botul o ia la pornire × comisionul taker.
// Neutrul nu cumpără la pornire (0); fără date - null. Negativă, ca totalFee; cel mult cât comisioanele de până acum.
const COMISION_TAKER=0.0005;
export function taxaIntrareServer({x,directie,investit,levier,jos,sus,comisioane}){
  const dir=String(directie||"").toLowerCase(),inv=nr(investit),lev=nr(levier)||1,j=nr(jos),s=nr(sus),p0=nr(x&&x.initPrice),com=nr(comisioane);
  if(dir&&dir!=="long"&&dir!=="short")return 0;
  if(!dir||!(inv>0)||!(j>0)||!(s>j)||!(p0>0))return null;
  const parte=Math.min(1,Math.max(0,dir==="long"?(s-p0)/(s-j):(p0-j)/(s-j)));
  const t=-inv*lev*parte*COMISION_TAKER;
  return com!==null&&com<=0?Math.max(t,com):t;
}

export function avertismenteBot(o){
  const {x,pret,jos,sus,lich,comisioane,gridProfitBrut,profitNet}=o;
  const avertismente=[];
  // v100.62 (specul „sfaturi concise”, pachetul 2): aceleasi conditii, scrise concis - „stop / țintă”, virgula, fara majuscule de
  // strigat, pretul lichidarii rotunjit (venea cu 16 zecimale); avertismentul lichidarii incepe ca alerta colectorului („Lichidarea la …”),
  // ca in „Ce ai de făcut acum” s-o inghita pe ea (un rand, nu doua)
  if(!nr(x.profitStop)&&!nr(x.lossStop))avertismente.push("Botul n-are nici stop, nici țintă în Pionex.");
  if(pret&&jos&&sus&&(pret<jos||pret>sus))
    // revizia Opus (I1, 02.10): „a ieșit din grid” ca alerta colectorului si sfatul „pericol” - in „Ce ai de făcut acum” un singur rand
    avertismente.push(`Prețul ${faraExp(pret)} a ieșit din grid pe ${pret<jos?"jos":"sus"} (${faraExp(jos)}–${faraExp(sus)}): botul nu mai face perechi cât stă afară.`);
  if(lich.lichidareDepasita)
    avertismente.push(`Lichidarea estimată (${pretScurt(lich.pretLichidare)}, partea de ${lich.lichidarePartea}) e depășită la prețul ${faraExp(pret)}: aș verifica botul în Pionex.`);
  else if(lich.distantaLichidarePct!==null&&lich.distantaLichidarePct<15)
    avertismente.push(`Lichidarea la ${virgula(lich.distantaLichidarePct.toFixed(1))}% (${pretScurt(lich.pretLichidare)}, partea de ${lich.lichidarePartea}).`);
  // Comisioanele sunt de vina DOAR cand chiar depasesc castigul din grid.
  // v100.330 (el, 12.11, HYPE la 14 minute: „Comisioanele (−0,06) depășesc câștigul grilelor (0,0)”): abia după o zi de viață (ca sfatul
  // „costuri”, TabloExtra.grileVsCosturi) și fără taxa de intrare (o dată, la pornire), spusă alături; fără vârstă / investiție - ca înainte
  const pornit=nr(o.pornitLa),tanar=pornit>0&&(nr(o.acum)||Date.now())-pornit<86400000;
  const tx=toate(comisioane)?taxaIntrareServer({x,directie:o.directie,investit:o.investit,levier:o.levier,jos,sus,comisioane}):null;
  const comG=tx?Math.min(0,comisioane-tx):comisioane;
  // revizia Opus (🟡2): botul tânăr nu primește nici ramura „botul e pe minus” - cu o grilă umplută era aceeași alarmă, altfel spusă
  if(tanar){}
  else if(toate(comisioane,gridProfitBrut)&&comG!==0&&Math.abs(comG)>gridProfitBrut)
    avertismente.push(tx?`Comisioanele (${usdt(comG)} USDT, fără taxa de intrare de ${usdt(tx)}) depășesc câștigul grilelor (${usdt(gridProfitBrut)} USDT).`
      :`Comisioanele (${usdt(comisioane)} USDT) depășesc câștigul grilelor (${usdt(gridProfitBrut)} USDT).`);
  else if(profitNet!==null&&profitNet<0&&gridProfitBrut!==null&&gridProfitBrut>0){
    const rest=comisioane!==null?profitNet-gridProfitBrut-comisioane:null;
    // v100.65 (M2 din revizia pachetului 2): cu sume in mii fraza veche trecea de 110 (116 pe BTC) - aceleasi trei cifre, mai scurt
    avertismente.push(rest!==null?`Grilele ${usdt(gridProfitBrut)} USDT; poziția și funding-ul ${usdt(rest)}, comisioanele ${usdt(comisioane)}: botul e pe minus.`
      :`Grilele câștigă ${usdt(gridProfitBrut)} USDT, dar botul e pe minus (comisioanele nu se știu).`);
  }
  return avertismente;
}
