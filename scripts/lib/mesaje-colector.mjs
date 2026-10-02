// Mesajele compuse de colector (Discord, pagina alerts), intr-un modul pur - v100.66 (specul „sfaturi concise”, pachetul 3):
// garda textelor (scripts/garda-texte.mjs) le genereaza si le verifica, ca pe alertele din public/lib/alerte.js.
// Fiecare intoarce { nivel, titlu, mesaj } (fara retea, fara stare). La pasul 1 textele sunt EXACT cele de dinainte.
// Cuvinte de care depinde codul: „nu mai poate citi” / „citește din nou” (TabloExtra.alertaRezolvata), „n-are plan” („Ce ai de făcut acum”).

const U2 = (v) => (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(2).replace(".", ",") + " USDT";

// coada Discord: mesajul plecat cu intarziere
export const intarziat = (titlu, minute) => titlu + " (întârziat " + minute + " min)";

export const serverOprit = (minute) => ({ nivel: "critic", titlu: "Crypto Radar s-a oprit: serverul de acasă nu mai răspunde",
  mesaj: "De ~" + minute + " minute serverul Radarului (fereastra neagră, :8788) nu răspunde, așa că și colectorul se oprește: alertele boților și ale acțiunilor NU mai vin. 👉 Pornește din nou PORNESTE-CRYPTO-RADAR.bat (sau PORNESTE-SI-PE-TELEFON.bat). Stopurile din Pionex lucrează și fără Radar." });

export const citireRea = (minute, eroare) => ({ nivel: "critic", titlu: "Crypto Radar nu mai poate citi botul",
  mesaj: "De " + minute + " minute: " + eroare + ". Alertele nu mai sunt de încredere până se rezolvă." });
export const citireDinNou = () => ({ nivel: "info", titlu: "Crypto Radar citește din nou botul", mesaj: "Alertele merg din nou." });

export const lipsaPionex = (nume) => ({ nivel: "critic", titlu: (nume || "Botul") + " nu mai apare în lista Pionex", mesaj: "Poate a fost închis sau lichidat. Verifică în aplicația Pionex." });

// pp = TabloExtra.propunePlan(...) = { plus, minus, afaraOre, nota } sau null
export const faraPlan = (nume, pp) => ({ nivel: "atentie", cheie: "fara-plan", titlu: nume + ": botul n-are plan",
  mesaj: "Fără țintă și prag scrise la rece nu te pot anunța când să încasezi sau să ieși." + (pp ? " Propun: plus +" + pp.plus + " USDT, minus −" + pp.minus + " USDT, " + pp.afaraOre + " h afară din grid (" + pp.nota + "). Îl pui din Tablou → „Pune planul propus”." : " Scrie-l în Tablou → „Planul tău”.") });

// ceasul gridului ingust (I-481): ore = durata probata, hm = ora inchiderii „HH:MM”, tarziu = colectorul a fost oprit
export const ceasIngust = (nume, ore, hm, tarziu) => ({ nivel: "atentie", titlu: nume + ": gridul îngust a ajuns la " + ore + " h",
  mesaj: "Așa a fost probat: închide-l acum (închiderea era la " + hm + (tarziu ? " — mesajul vine întârziat, colectorul a fost oprit" : "") + "). Ținut mai mult, nu mai seamănă cu proba (un interval îngust iese repede din preț)." });

export const t212DinNou = () => ({ nivel: "info", titlu: "Trading 212 răspunde din nou", mesaj: "Alertele de stop și țintă pe acțiuni merg din nou." });
export const t212Rau = (minute, status, eroare) => ({ nivel: "critic", titlu: "Trading 212 nu mai răspunde de " + minute + " min",
  mesaj: (status === 401 || status === 403 ? "Cheia API pare expirată sau revocată (" + status + "). " : "") + eroare + ". Alertele de stop și țintă pe pozițiile Trading 212 NU mai vin până se rezolvă. 👉 Verifică cheia în Trading 212 (Settings → API) și pune-o din nou cu PUNE-CHEILE-T212.bat; stopurile puse direct în Trading 212 lucrează și fără Radar." });

// pond = ponderea pozitiei in cont (0..1)
export const pondereT212 = (s, pond) => ({ nivel: "atentie", titlu: s + " e " + Math.round(pond * 100) + "% din contul Trading 212",
  mesaj: "Peste plafonul de 20%: o zi proastă a ei e ziua proastă a contului. 👉 Ce aș face eu: n-aș mai adăuga la " + s + "; la următoarea creștere aș vinde o parte." });

export const raport = (data, linii) => ({ nivel: "info", titlu: "Raportul de duminică (" + data + ")", mesaj: linii.join("\n") });
export const autopsie = (data, linii) => ({ nivel: "info", titlu: "Autopsia acțiunilor (" + data + ")", mesaj: linii.join("\n") });

export const legat = () => ({ nivel: "info", titlu: "Crypto Radar: alertele sunt legate",
  mesaj: "De aici vin alertele botului: lichidare aproape, Pionex în stare anormală, prețul ieșit din grid, piața pe 4 ore împotriva botului, gata liniștea (oprește gridul)." });

export const perechiOra = (nume, n, usdt) => ({ nivel: "info", titlu: "✅ " + nume + ": " + (n === 1 ? "o pereche încheiată" : n + " perechi încheiate") + " în ultima oră, " + U2(usdt) + " din grile",
  mesaj: "Fiecare pereche se vede în Radar (Alerte). Pe Discord vine un rezumat pe oră, ca alertele importante să nu se piardă printre ele." });

// text = Obiceiuri.frana(...).text (pachetul 5)
export const frana = (text) => ({ nivel: "critic", titlu: "🛑 Frâna contului: gata pe azi", mesaj: text + " Pragurile le schimbi în Radar → Grid → Poarta de pornire." });
