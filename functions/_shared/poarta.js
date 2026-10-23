// O coada GLOBALA intre cereri (Workers pastreaza modulul de la o cerere la alta) are o capcana:
// o cerere ABANDONATA (clientul a plecat - telefonul a pierdut legatura) are timerele anulate de
// Cloudflare, promisiunea ei nu se mai termina, iar TOATE cererile de dupa asteapta la nesfarsit
// ("Worker's code had hung"). Vazut 26.09 la 06:49 (bot-orders) si la 13:10 (preturile Pionex).
// Cererea din fata e asteptata cel mult `ms` (cat poate dura ea legitim), apoi se trece peste ea.
// v100.259 (auditul 23.10, punctul 9): o cerere ABANDONATĂ de client (colectorul renunță la 20 s, pagina la 12 s) rămânea în coada de ritm
// și tot pleca la Pionex când îi venea rândul - ardea cota degeaba și împingea ritmul celor vii. La ieșirea din coadă: semnalul cererii
// anulat SAU cel puțin COADA_MAX_MS de așteptare ⇒ nu mai pleacă (eroareAbandon). Termenul ține și unde runtime-ul nu anulează semnalul.
export const COADA_MAX_MS=20000;
export function abandonata(semnal,intratLa,acum=Date.now(),maxMs=COADA_MAX_MS){return !!(semnal&&semnal.aborted)||acum-intratLa>=maxMs}
export function eroareAbandon(){return Object.assign(Error("cererea a fost abandonată cât aștepta la rând (n-a mai plecat spre Pionex)"),{status:499,abandonata:true})}
export function dupaCelDinFata(inainte,ms){
  let t;
  return Promise.race([inainte,new Promise(r=>{t=setTimeout(r,ms)})]).finally(()=>clearTimeout(t));
}
