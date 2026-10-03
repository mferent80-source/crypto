// v101.59 (03.10, Busola 1.36, §2 „paza boților” - aprobat de el): pentru fiecare bot deschis, starea Busolei pe moneda lui pe 4h
// (perp4h ?? grid4h ?? 4h, Busola.pazaStare). UN mesaj la TRECEREA în „mai agitată ca de obicei” (din liniște / nimic neobișnuit /
// nemăsurat), nerepetat cât rămâne; iese și reintră -> din nou. Tace: rezumat lipsă sau vechi (> 4,5 h; starea rămâne neatinsă, ca o
// trecere să nu se piardă și să nu se dubleze), „nemasurat”, prima vedere a unui bot vechi (după o repornire). Botul NOU (sub 30 min)
// pe o monedă deja agitată primește mesajul - acolo nu e nicio „trecere” de prins. Modul pur (fără rețea), probat în proba-v10086.mjs.
import * as MC from "./mesaje-colector.mjs";

const NOU_MS = 30 * 60000;

// { tine: false, mesaj: null } = nu atinge starea; { tine: true, stare: { stare, la }, mesaj | null }
export function pazaBot({ Busola, rez, bot, inainte, acum, pret }) {
  const nume = String(bot && bot.baza || "").replace(/\.PERP$/, "");
  const p = Busola.pazaStare(rez, nume, acum);
  if (!p || p.vechi) return { tine: false, mesaj: null };
  const stare = { stare: p.stare, la: p.la };
  const nou = !inainte && Number(bot.pornitLa) > 0 && acum - Number(bot.pornitLa) < NOU_MS;
  if (!(p.stare === "miscare" && (inainte ? inainte.stare !== "miscare" : nou))) return { tine: true, stare, mesaj: null };
  const jos = Number(bot.gridJos), sus = Number(bot.gridSus), f = typeof pret === "function" ? pret : String;
  return { tine: true, stare, mesaj: MC.busolaMiscare({ nume, directie: bot.directie, levier: bot.levier, nou: !inainte,
    interval: jos > 0 && sus > 0 ? f(jos) + " – " + f(sus) : null, cifra: Busola.cifraMiscare(rez) }) };
}

// pasul din bucla colectorului: mesajul care n-a plecat nu mută starea (tura următoare reîncearcă, ca la celelalte alerte)
export async function pazaPas({ Busola, rez, bot, st, acum, pret, trimite }) {
  const d = pazaBot({ Busola, rez, bot, inainte: st._busola, acum, pret });
  if (!d.tine) return d;
  if (d.mesaj && !(await trimite(d.mesaj))) return Object.assign({}, d, { trimis: false });
  st._busola = d.stare;
  return d;
}

// rezumatul vechi: o notă doar în Radar, o dată pe rezumat (anuntat = `la`-ul rezumatului deja anunțat)
export function notaVeche({ Busola, rez, acum, anuntat }) {
  const la = rez ? Number(rez.la) : NaN;
  if (!(la > 0) || acum - la <= Busola.PAZA_VECHI_MS || anuntat === la) return null;
  return Object.assign(MC.busolaVeche(Math.floor((acum - la) / 3600000)), { la });
}
