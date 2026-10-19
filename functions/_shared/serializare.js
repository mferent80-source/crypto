// audit 19.10: scrierile citeste-modifica-scrie in KV (get, apoi put) se suprapuneau: doua cereri citeau aceeasi lista, fiecare isi
// adauga randul, iar a doua put o stergea pe prima (alerte, ferestre, verdicte, decizii). Serverul de acasa e UN singur izolat ⇒
// un lant de promisiuni pe cheie ajunge: fiecare get+put asteapta sa se termine cel din fata pe aceeasi cheie.
// Cel din fata e asteptat cel mult ASTEPTARE_MAX_MS (dupaCelDinFata): o cerere abandonata nu tine lantul agatat (vezi poarta.js).
import {dupaCelDinFata} from "./poarta.js";
export const ASTEPTARE_MAX_MS=15000;
const lanturi=new Map();
export function peCheie(cheie,fn,ms=ASTEPTARE_MAX_MS){
  const inainte=lanturi.get(cheie);
  const rulare=(inainte?dupaCelDinFata(inainte,ms):Promise.resolve()).then(()=>fn());
  const coada=rulare.then(()=>{},()=>{});
  lanturi.set(cheie,coada);
  coada.then(()=>{if(lanturi.get(cheie)===coada)lanturi.delete(cheie)});
  return rulare;
}
// doar pentru probe: cate chei au inca un lant deschis
export function lanturiDeschise(){return lanturi.size}
