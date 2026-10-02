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
const usdt=v=>{const a=Math.abs(v),s=a.toFixed(a>0&&a<0.01?4:2);return (Number(s)===0?"":v<0?"−":"+")+virgula(s)};
// pretul calculat (lichidarea estimata): ~5 cifre semnificative, ca preturile Pionex; peste 1000, 2 zecimale
const pretScurt=v=>v===null||v===undefined||!Number.isFinite(v)?"—":Math.abs(v)>=1000?v.toFixed(2):String(Number(v.toPrecision(5)));

export function avertismenteBot(o){
  const {x,pret,jos,sus,lich,comisioane,gridProfitBrut,profitNet}=o;
  const avertismente=[];
  // v100.62 (specul „sfaturi concise”, pachetul 2): aceleasi conditii, scrise concis - „stop / țintă”, virgula, fara majuscule de
  // strigat, pretul lichidarii rotunjit (venea cu 16 zecimale); avertismentul lichidarii incepe ca alerta colectorului („Lichidarea la …”),
  // ca in „Ce ai de făcut acum” s-o inghita pe ea (un rand, nu doua)
  if(!nr(x.profitStop)&&!nr(x.lossStop))avertismente.push("Botul n-are nici stop, nici țintă în Pionex.");
  if(pret&&jos&&sus&&(pret<jos||pret>sus))
    avertismente.push(`Prețul ${pret} e ${pret<jos?"sub":"peste"} grid (${jos}–${sus}): botul nu mai face perechi cât stă afară.`);
  if(lich.lichidareDepasita)
    avertismente.push(`Lichidarea estimată (${pretScurt(lich.pretLichidare)}, partea de ${lich.lichidarePartea}) e depășită la prețul ${pret}: aș verifica botul în Pionex.`);
  else if(lich.distantaLichidarePct!==null&&lich.distantaLichidarePct<15)
    avertismente.push(`Lichidarea la ${virgula(lich.distantaLichidarePct.toFixed(1))}% (${pretScurt(lich.pretLichidare)}, partea de ${lich.lichidarePartea}).`);
  // Comisioanele sunt de vina DOAR cand chiar depasesc castigul din grid.
  if(toate(comisioane,gridProfitBrut)&&comisioane!==0&&Math.abs(comisioane)>gridProfitBrut)
    avertismente.push(`Comisioanele (${usdt(comisioane)} USDT) depășesc câștigul grilelor (${usdt(gridProfitBrut)} USDT).`);
  else if(profitNet!==null&&profitNet<0&&gridProfitBrut!==null&&gridProfitBrut>0){
    const rest=comisioane!==null?profitNet-gridProfitBrut-comisioane:null;
    avertismente.push(rest!==null?`Grilele câștigă (${usdt(gridProfitBrut)} USDT), dar poziția și funding-ul (${usdt(rest)}) și comisioanele (${usdt(comisioane)}) duc botul pe minus.`
      :`Grilele câștigă (${usdt(gridProfitBrut)} USDT), dar botul e pe minus (comisioanele nu se știu).`);
  }
  return avertismente;
}
