// Mesajele compuse de colector (Discord, pagina alerts), intr-un modul pur - v100.66 (specul „sfaturi concise”, pachetul 3):
// garda textelor (scripts/garda-texte.mjs) le genereaza si le verifica, ca pe alertele din public/lib/alerte.js.
// Fiecare intoarce { nivel, titlu, mesaj } (fara retea, fara stare). v100.68: scrise concis - titlul ≤ 60, mesajul pe 2 randuri
// (faptul · „👉 ” actiunea la persoana I), virgula zecimala, fara majuscule de strigat.
// Cuvinte de care depinde codul: „nu mai poate citi” / „citește din nou” (TabloExtra.alertaRezolvata), „n-are plan” („Ce ai de făcut acum”).

const U2 = (v) => (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(2).replace(".", ",") + " USDT";
const V = (v) => String(Math.round(Math.abs(Number(v)) * 100) / 100).replace(".", ",");
const scurt = (s, n) => { s = String(s || ""); return s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…"; };
const msg = (fapt, act) => fapt + (act ? "\n👉 " + act : "");

// coada Discord: mesajul plecat cu intarziere
export const intarziat = (titlu, minute) => titlu + " (întârziat " + minute + " min)";

export const serverOprit = (minute) => ({ nivel: "critic", titlu: "Crypto Radar oprit: serverul de acasă nu mai răspunde",
  mesaj: msg("De ~" + minute + " minute serverul Radarului (fereastra neagră, :8788) nu răspunde, deci și colectorul s-a oprit: alertele boților și ale acțiunilor nu mai vin.",
    "Aș porni PORNESTE-CRYPTO-RADAR.bat sau PORNESTE-SI-PE-TELEFON.bat; stopurile din Pionex merg și fără Radar.") });

export const citireRea = (minute, eroare) => ({ nivel: "critic", titlu: "Crypto Radar nu mai poate citi botul",
  mesaj: "De " + minute + " minute (" + scurt(eroare, 60) + ") alertele nu mai sunt de încredere până se rezolvă." });
export const citireDinNou = () => ({ nivel: "info", titlu: "Crypto Radar citește din nou botul", mesaj: "Alertele merg din nou." });

export const lipsaPionex = (nume) => ({ nivel: "critic", titlu: (nume || "Botul") + " nu mai apare în lista Pionex", mesaj: msg("Poate a fost închis sau lichidat.", "Aș verifica în aplicația Pionex.") });

// pp = TabloExtra.propunePlan(...) = { plus, minus, afaraOre, nota } sau null
// v100.70 (revizia pachetului 3, I4): nota implicita a lui TabloExtra.propunePlan („propunerea mea: +3% / −15% din investiție / 12 h afară
// din grid”) repeta „Propun” si orele - ramane doar baza procentelor; nota „după planul tău de la …” ramane intreaga
const notaPlan = (n) => { n = String(n || ""); const m = n.match(/^propunerea mea:\s*(.+?)(?:\s*\/\s*\d+ h afară din grid)?$/); return m ? " (" + m[1] + ")" : n ? ", " + n : ""; };
export const faraPlan = (nume, pp) => ({ nivel: "atentie", cheie: "fara-plan", titlu: nume + ": botul n-are plan",
  mesaj: pp ? msg("Propun +" + V(pp.plus) + " / −" + V(pp.minus) + " USDT și " + pp.afaraOre + " h afară din grid" + notaPlan(pp.nota) + ".","Aș pune planul propus din Tablou: fără el nu te pot anunța când să încasezi sau să închizi.")
    : msg("Fără țintă și prag scrise la rece nu te pot anunța când să încasezi sau să închizi botul.", "Aș scrie planul în Tablou → „Planul tău”.") });

// ceasul gridului ingust (I-481): ore = durata probata, hm = ora inchiderii „HH:MM”, tarziu = colectorul a fost oprit
export const ceasIngust = (nume, ore, hm, tarziu) => ({ nivel: "atentie", titlu: nume + ": gridul îngust a ajuns la " + ore + " h",
  mesaj: msg("Așa a fost probat (închiderea era la " + hm + (tarziu ? "; mesajul vine întârziat, colectorul a fost oprit" : "") + "): ținut mai mult, nu mai seamănă cu proba.",
    "Aș închide botul acum: un interval îngust iese repede din preț.") });

export const t212DinNou = () => ({ nivel: "info", titlu: "Trading 212 răspunde din nou", mesaj: "Alertele de stop și țintă pe acțiuni merg din nou." });
export const t212Rau = (minute, status, eroare) => ({ nivel: "critic", titlu: "Trading 212 nu mai răspunde de " + minute + " min",
  mesaj: msg((status === 401 || status === 403 ? "Cheia API pare expirată sau revocată (" + status + ")" : scurt(eroare, 60)) + ": alertele de stop și țintă nu mai vin; stopurile puse în Trading 212 merg și fără Radar.",
    "Aș verifica cheia în Trading 212 (Settings → API) și aș pune-o din nou cu PUNE-CHEILE-T212.bat.") });

// pond = ponderea pozitiei in cont (0..1)
export const pondereT212 = (s, pond) => ({ nivel: "atentie", titlu: s + " e " + Math.round(pond * 100) + "% din contul Trading 212",
  mesaj: msg("Peste plafonul de 20%: o zi proastă a ei e ziua proastă a contului.", "N-aș mai adăuga la " + s + "; la următoarea creștere aș vinde o parte.") });

// rapoartele: randurile vin gata (Obiceiuri / Consiliu - pachetul 5); aici doar titlul
export const raport = (data, linii) => ({ nivel: "info", titlu: "Raportul de duminică (" + data + ")", mesaj: linii.join("\n") });
export const autopsie = (data, linii) => ({ nivel: "info", titlu: "Autopsia acțiunilor (" + data + ")", mesaj: linii.join("\n") });

export const legat = () => ({ nivel: "info", titlu: "Crypto Radar: alertele sunt legate",
  mesaj: "De aici vin alertele botului: lichidarea aproape, Pionex în stare anormală, prețul ieșit din grid, piața pe 4 ore contra botului, mișcarea mare." });

export const perechiOra = (nume, n, usdt) => ({ nivel: "info", titlu: "✅ " + nume + ": " + (n === 1 ? "o pereche" : n + (n >= 20 ? " de" : "") + " perechi") + " în ultima oră, " + U2(usdt) + " din grile",
  mesaj: "Fiecare pereche e în Radar (Alerte); pe Discord vine un rezumat pe oră, ca alertele importante să nu se piardă printre ele." });

// f = Obiceiuri.frana(...) (obiectul: depasit, netZi, netSapt, rand, praguri)
// v100.70 (revizia pachetului 3, I3): din OBIECTUL Obiceiuri.frana - textul lui are deja titlul, actiunea si sumele cu punct (pe Discord
// ieseau de doua ori); aici: pragurile depasite, cu virgula, intr-o fraza. Un text vechi (string) ramane primit, fara titlu si actiune.
const DEP = { zi: (f) => "azi " + U2(f.netZi) + " (pragul tău: −" + V(f.praguri.zi) + ")", sapt: (f) => "pe 7 zile " + U2(f.netSapt) + " (pragul: −" + V(f.praguri.sapt) + ")",
  rand: (f) => f.rand + " boți închiși pe minus la rând (pragul: " + f.praguri.rand + ")" };
export const frana = (f) => {
  const parti = f && typeof f === "object" && Array.isArray(f.depasit) && f.praguri ? f.depasit.map((d) => (DEP[d.cod] ? DEP[d.cod](f) : d.text)).filter(Boolean) : [];
  const fapt = parti.length ? parti.join(", ") : String(f && typeof f === "object" ? f.text || "" : f || "").replace(/^Frâna contului: gata pe azi\s*—\s*/, "").replace(/\s*N-aș mai porni boți azi;.*$/, "");
  return { nivel: "critic", titlu: "🛑 Frâna contului: gata pe azi", mesaj: msg(fapt.charAt(0).toUpperCase() + fapt.slice(1).replace(/\.?\s*$/, "."), "N-aș mai porni boți azi (mâine, cu capul limpede); pragurile se schimbă în Radar → Grid → Poarta de pornire.") };
};
