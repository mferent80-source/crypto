// Avertismentele serverului pentru un bot (v100.62, specul „sfaturi concise”, pachetul 2): scoase din functions/api/bot-orders.js
// intr-o functie pura, ca garda textelor (scripts/garda-texte.mjs) sa le poata genera si verifica - aceleasi conditii, aceleasi texte.
// o = { x: buOrderData, pret, jos, sus, lich: { pretLichidare, lichidarePartea, distantaLichidarePct, lichidareDepasita }, comisioane, gridProfitBrut, profitNet }
const nr=v=>{
  if(typeof v==="number")return Number.isFinite(v)?v:null;
  if(typeof v!=="string"||!v.trim())return null;
  const x=Number(v);return Number.isFinite(x)?x:null;
};
const toate=(...a)=>a.every(x=>x!==null);
const ban=v=>{const a=Math.abs(v);return a.toFixed(a>0&&a<0.01?4:2)};
const semn=v=>(v<0?"−":"+")+ban(v);

export function avertismenteBot(o){
  const {x,pret,jos,sus,lich,comisioane,gridProfitBrut,profitNet}=o;
  const avertismente=[];
  if(!nr(x.profitStop)&&!nr(x.lossStop))avertismente.push("Botul nu are niciun opritor configurat.");
  if(pret&&jos&&sus&&(pret<jos||pret>sus))
    avertismente.push(`Prețul ${pret} a ieșit din intervalul grid (${jos}…${sus}) — botul nu mai câștigă din oscilații.`);
  if(lich.lichidareDepasita)
    avertismente.push(`Lichidarea DEPĂȘITĂ: prețul ${pret} a trecut de lichidarea estimată ${lich.pretLichidare} (partea de ${lich.lichidarePartea}) — verifică botul în Pionex.`);
  else if(lich.distantaLichidarePct!==null&&lich.distantaLichidarePct<15)
    avertismente.push(`Până la lichidare (${lich.lichidarePartea}, la ${lich.pretLichidare}) mai sunt ${lich.distantaLichidarePct.toFixed(1)}%.`);
  // Comisioanele sunt de vina DOAR cand chiar depasesc castigul din grid.
  if(toate(comisioane,gridProfitBrut)&&comisioane!==0&&Math.abs(comisioane)>gridProfitBrut)
    avertismente.push(`Gridul a câștigat ${semn(gridProfitBrut)}, comisioanele au luat ${semn(comisioane)} — comisioanele mănâncă mai mult decât câștigă botul.`);
  else if(profitNet!==null&&profitNet<0&&gridProfitBrut!==null&&gridProfitBrut>0){
    const rest=comisioane!==null?profitNet-gridProfitBrut-comisioane:null;
    avertismente.push(`Profitul NET e negativ deși gridul câștigă: grid ${semn(gridProfitBrut)}, comisioane ${comisioane!==null?semn(comisioane):"necunoscute"}`+
      (rest!==null?`, restul ${semn(rest)} din poziție/finanțare.`:"."));
  }
  return avertismente;
}
