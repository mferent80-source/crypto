// O coada GLOBALA intre cereri (Workers pastreaza modulul de la o cerere la alta) are o capcana:
// o cerere ABANDONATA (clientul a plecat - telefonul a pierdut legatura) are timerele anulate de
// Cloudflare, promisiunea ei nu se mai termina, iar TOATE cererile de dupa asteapta la nesfarsit
// ("Worker's code had hung"). Vazut 26.09 la 06:49 (bot-orders) si la 13:10 (preturile Pionex).
// Cererea din fata e asteptata cel mult `ms` (cat poate dura ea legitim), apoi se trece peste ea.
export function dupaCelDinFata(inainte,ms){
  let t;
  return Promise.race([inainte,new Promise(r=>{t=setTimeout(r,ms)})]).finally(()=>clearTimeout(t));
}
