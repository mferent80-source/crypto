// audit 19.10: O SINGURA stare de lacat Pionex pentru tot serverul. Pionex blocheaza IP-ul: `X-RateLimit-Lock` = ora deblocarii (secunde
// Unix), iar fiecare cerere din timpul lacatului il prelungeste (v100.208, masurat 16.10). Inainte poarta publica (api/market.js) citea doar
// retry-after si racea 75 s, poarta privata (_shared/pionex.js) citea lacatul, iar tickerele PERP / simbolurile din bot-orders si sonda
// `deep` din provider-health nu se uitau la niciunul. Acum toate citesc si scriu aici; ritmul normal (pauzele portilor) nu se schimba.
let panaLa=0;
export function lacatRamasMs(acum=Date.now()){return Math.max(0,panaLa-acum)}
export function lacatPanaLa(){return panaLa}
export function puneLacatPana(t){if(Number.isFinite(t)&&t>panaLa)panaLa=t;return panaLa}
// doar pentru probe (o cheama si reseteazaRitmPionex)
export function reseteazaLacatPionex(){panaLa=0}
export const oraRo=t=>new Date(t).toLocaleTimeString("ro-RO",{timeZone:"Europe/Bucharest",hour:"2-digit",minute:"2-digit"});
// Un raspuns Pionex refuzat (>= 400): `x-ratelimit-lock` in viitor ⇒ lacatul pana atunci; 429 ⇒ cel putin racireS secunde.
// Intoarce secundele puse (0 = nimic de pus).
export function lacatDinRaspuns(antete,status,racireS,acum=Date.now()){
  if(!(status>=400))return 0;
  const lock=Number(antete&&typeof antete.get==="function"?antete.get("x-ratelimit-lock"):NaN)*1000;
  let pana=status===429?acum+Math.max(0,Number(racireS)||0)*1000:0;
  if(Number.isFinite(lock)&&lock>pana)pana=lock;
  if(!(pana>acum))return 0;
  puneLacatPana(pana);
  return Math.ceil((pana-acum)/1000);
}
// eroarea data cat tine lacatul (nimic nu pleaca spre Pionex); lacatul lung (ore) se spune cu ora lui
export function eroareLacat(prefix="Pionex rate limit",acum=Date.now()){
  const s=Math.max(1,Math.ceil(lacatRamasMs(acum)/1000));
  const ora=s>120?` (blocat până la ${oraRo(panaLa)})`:"";
  return Object.assign(Error(`${prefix}: retry in ${s}s${ora}`),{status:429,retryAfter:s});
}
