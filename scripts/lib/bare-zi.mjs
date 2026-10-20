// v101.130: bara zilnică a unui ticker. NYSE rămâne bareBursa (ora New York, aceleași cazuri ca acasă).
// Xetra și Londra scot ultima bară până la închiderea bursei LOR. Ore inventate pentru alte piețe nu intră aici:
// ce nu recunoaște CalendarBursa.bursaSimbol cade pe NYSE.
export function bareZi(G, CB, randuri, acum, simbol) {
  if (!G) return [];
  if (!CB || !simbol || CB.bursaSimbol(simbol) === "NYSE") return G.bareBursa(randuri, acum);
  const b = G.bareToate(randuri);
  if (!b.length) return b;
  try {
    const ult = b[b.length - 1];
    if (!(CB.inchidereLa(CB.ziLocala(ult.t, simbol), simbol) <= acum)) b.pop();
  } catch (e) {}
  return b;
}
