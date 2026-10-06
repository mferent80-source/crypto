// Mesajele compuse de colector (Discord, pagina alerts), intr-un modul pur - v100.66 (specul „sfaturi concise”, pachetul 3):
// garda textelor (scripts/garda-texte.mjs) le genereaza si le verifica, ca pe alertele din public/lib/alerte.js.
// Fiecare intoarce { nivel, titlu, mesaj } (fara retea, fara stare). v100.68: scrise concis - titlul ≤ 60, mesajul pe 2 randuri
// (faptul · „👉 ” actiunea la persoana I), virgula zecimala, fara majuscule de strigat.
// Cuvinte de care depinde codul: „nu mai poate citi” / „citește din nou” (TabloExtra.alertaRezolvata), „n-are plan” („Ce ai de făcut acum”).

// v100.76 (revizia ideilor): „1 bot”, „20 de boți”, „101 cazuri” - TextRo.cate; rezerva știe aceeași regulă (contextele fără TextRo)
function cate(n, sg, pl) { if (typeof TextRo !== "undefined" && TextRo.cate) return TextRo.cate(n, sg, pl); var k = Math.round(Number(n)), r = Math.abs(k) % 100; return !isFinite(k) ? "— " + pl : k === 1 ? "1 " + sg : k + (r >= 20 || (r === 0 && Math.abs(k) >= 100) ? " de " : " ") + pl; }
const U2 = (v) => (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(2).replace(".", ",") + " USDT";
const V = (v) => String(Math.round(Math.abs(Number(v)) * 100) / 100).replace(".", ",");
const V1 = (v) => Math.abs(Number(v)).toFixed(1).replace(".", ",");   // v101.70: rezultatele cu o singură zecimală
const scurt = (s, n) => { s = String(s || ""); return s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…"; };
const msg = (fapt, act) => fapt + (act ? "\n👉 " + act : "");

// coada Discord: mesajul plecat cu intarziere
export const intarziat = (titlu, minute) => titlu + " (întârziat " + minute + " min)";

export const serverOprit = (minute) => ({ nivel: "critic", titlu: "Crypto Radar oprit: serverul de acasă nu mai răspunde",
  mesaj: msg("De ~" + cate(minute, "minut", "minute") + " serverul Radarului (fereastra neagră, :8788) nu răspunde, deci și colectorul s-a oprit: alertele boților și ale acțiunilor nu mai vin.",
    "Aș porni PORNESTE-CRYPTO-RADAR.bat sau PORNESTE-SI-PE-TELEFON.bat; stopurile din Pionex merg și fără Radar.") });

export const citireRea = (minute, eroare) => ({ nivel: "critic", titlu: "Crypto Radar nu mai poate citi botul",
  mesaj: "De " + cate(minute, "minut", "minute") + " (" + scurt(eroare, 60) + ") alertele nu mai sunt de încredere până se rezolvă." });
export const citireDinNou = () => ({ nivel: "info", titlu: "Crypto Radar citește din nou botul", mesaj: "Alertele merg din nou." });

export const lipsaPionex = (nume) => ({ nivel: "critic", titlu: (nume || "Botul") + " nu mai apare în lista Pionex", mesaj: msg("Poate a fost închis sau lichidat.", "Aș verifica în aplicația Pionex.") });

// pp = TabloExtra.propunePlan(...) = { plus, minus, afaraOre, nota } sau null
// v100.70 (revizia pachetului 3, I4): nota implicita a lui TabloExtra.propunePlan („propunerea mea: +3% / −15% din investiție / 12 h afară
// din grid”) repeta „Propun” si orele - ramane doar baza procentelor; nota „după planul tău de la …” ramane intreaga
const notaPlan = (n) => { n = String(n || ""); const m = n.match(/^propunerea mea:\s*(.+?)(?:\s*\/\s*\d+ h afară din grid)?$/); return m ? " (" + m[1] + ")" : n ? ", " + n : ""; };
export const faraPlan = (nume, pp) => ({ nivel: "atentie", cheie: "fara-plan", titlu: nume + ": botul n-are plan",
  mesaj: pp ? msg("Propun +" + V(pp.plus) + " / −" + V(pp.minus) + " USDT și " + pp.afaraOre + " h afară din grid" + notaPlan(pp.nota) + ".","Aș pune planul propus din Tablou: fără el nu te pot anunța când să încasezi sau să închizi.")
    : msg("Fără țintă și prag scrise la rece nu te pot anunța când să încasezi sau să închizi botul.", "Aș scrie planul în Tablou → „Planul tău”.") });

// v101.70 (05.10, el: „să nu se mai întâmple situația de azi”, TAKE): botul nou cu gridul prea larg pentru levier - o dată, la primul tur;
// x = TabloExtra.gridVsPlan(b, planMinus) (+ plan). Azi alerta „gridul e mai larg decât planul” a venit după 3 ore, doar după planul scris.
export const gridPreaLarg = (nume, x) => ({ nivel: "atentie", cheie: "grid-larg", titlu: nume + ": gridul e prea larg pentru levier",
  mesaj: msg("La marginea de " + x.parte + " pierzi ≈ " + V1(x.laMargine) + " USDT (" + Math.round((x.procent || 0) * 100) + "% din bani), pragul de pierdere −" + V1(x.plan)
    + (x.moarte != null && x.intervale ? "; cu stopul la prag, " + x.moarte + " din " + cate(x.intervale, "grilă", "grile") + " n-ar lucra." : "."),
    "Aș închide aproape de zero și aș porni ÎNGUST sau LARG din fișă" + (x.stopPlan ? "; dacă-l ții, stopul la " + String(Number(x.stopPlan.toPrecision(4))).replace(".", ",") : "") + ".") });

// v101.74 (I-547): becul 1z al unei poziții T212 a trecut în jos (aceeași regulă ca semaforul paginii) - o dată pe schimbare
const P1 = (f) => (f > 0 ? "+" : f < 0 ? "−" : "") + Math.abs(100 * f).toFixed(1).replace(".", ",") + "%";
export const bec1zContra = (simbol, vechime, pct) => ({ nivel: "atentie", cheie: "bec1z", titlu: simbol + ": trendul pe 1 zi a trecut în jos",
  mesaj: msg("Becul 1z al poziției e roșu de " + cate(Math.max(1, Number(vechime) || 1), "zi", "zile") + " (EMA 20 sub EMA 50, prețul merge în jos); ești pe " + P1(pct) + " față de prețul mediu.",
    "N-aș cumpăra în plus până nu se întoarce; aș verifica stopul din plan.") });

// v101.73 (I-538): botul nou seamănă cu o fereastră din fișă (GridPlan.fereastraBotului) - o dată, cu ora fișei și proba ferestrei
const oraRo = (t) => { try { return new Intl.DateTimeFormat("ro-RO", { timeZone: "Europe/Bucharest", hour: "2-digit", minute: "2-digit" }).format(new Date(t)); } catch { return ""; } };
export const pornitCa = (nume, f) => {
  if (!f.k) return { nivel: "atentie", cheie: "pornit-ca", titlu: nume + ": pornit cu alt grid decât fișa",
    mesaj: msg("Nu seamănă nici cu ÎNGUST, nici cu LARG din fișa de la " + oraRo(f.t) + ".", "Aș verifica poarta: gridul poate să nu încapă în pragul tău de pierdere.") };
  const larg = f.k === "larg", ore = Number(f.oreTipic) > 0 ? Math.round(Number(f.oreTipic)) : null;
  return { nivel: "info", cheie: "pornit-ca", titlu: nume + ": pornit ca " + (larg ? "LARG" : "ÎNGUST") + " din fișă",
    // v101.77 (ZAMA, 06.10): levierul diferit de al fișei se spune, nu mai face din fereastră „alt grid”
    mesaj: msg("Seamănă cu " + (larg ? "LARG" : "ÎNGUST") + " din fișa de la " + oraRo(f.t) + (Number(f.levierFisa) > 0 && Number(f.levierBot) > 0 && Math.round(f.levierFisa) !== Math.round(f.levierBot) ? " (levierul " + Math.round(f.levierBot) + "×, fișa avea " + Math.round(f.levierFisa) + "×)" : "")
      + (Number(f.stop) >= 0 && Number(f.n) > 0 ? "; în probă stopul a venit de " + cate(f.stop, "dată", "ori") + " din " + cate(f.n, "pornire", "porniri") : "") + ".",
      larg ? "Aș lăsa botul să lucreze; dacă stă peste " + (ore ? 2 * ore + " h" : "de două ori durata tipică") + ", te anunț." : "Aș ține stopul la marginea gridului: îngust iese repede" + (ore ? " (tipic " + ore + " h)" : "") + ".") };
};
// v101.78 (I-563): botul stă de 24 h și e pe minus - o dată, cu cifrele lui (din boții tăi care au ajuns la 24 h; raportul de noapte RiscLuna)
// v101.79 (revizia, I1): sfatul urmează cifrele lui (p = rândul de 24 h din RiscLuna.supravietuire), ca rândul 1 să nu-l contrazică pe 2
const sfat24 = (p) => !p ? "Aș verifica acum stopul botului, dacă nu are unul."
  : p.medie >= 0 ? "Aș lăsa botul, dar cu stop: la tine, boții ținuți peste o zi au ieșit în medie pe plus."
  : p.pePlus >= 0.5 ? "Aș pune un stop aproape: cei mai mulți revin, dar pierderile mari trag media în jos."
  : "Aș închide botul care stă de peste o zi pe minus, în loc să aștept să revină.";
export const minus24h = (nume, ore, total, textBot, p) => ({ nivel: "atentie", cheie: "minus-24h", titlu: nume + ": " + Math.round(ore) + " h pe minus (" + U2(total) + ")",
  mesaj: msg(textBot && p ? textBot : "Botul stă de " + Math.round(ore) + " h și e pe " + U2(total) + "; încă n-am raportul de risc cu istoria ta.", sfat24(textBot ? p : null)) });
// v101.73 (I-540): ceasul ferestrei LARG - botul stă de peste 2× durata tipică din proba ferestrei
export const ceasLarg = (nume, ore, tipic) => ({ nivel: "info", cheie: "ceas-larg", titlu: nume + ": LARG stă de " + Math.round(ore) + " h (tipic " + Math.round(tipic) + " h)",
  mesaj: msg("Banii stau în grid de peste două ori mai mult decât în probă.", "Aș închide aproape de zero dacă prețul nu mai trece prin grid; dacă lucrează, îl las.") });

// ceasul gridului ingust (I-481): ore = durata probata, hm = ora inchiderii „HH:MM”, tarziu = colectorul a fost oprit
export const ceasIngust = (nume, ore, hm, tarziu) => ({ nivel: "atentie", titlu: nume + ": gridul îngust a ajuns la " + ore + " h",
  mesaj: msg("Așa a fost probat (închiderea era la " + hm + (tarziu ? "; mesajul vine întârziat, colectorul a fost oprit" : "") + "): ținut mai mult, nu mai seamănă cu proba.",
    "Aș închide botul acum: un interval îngust iese repede din preț.") });

// v101.59 (Busola 1.36, §2 „paza boților”, aprobat de el 03.10): moneda botului a trecut în „mai agitată ca de obicei” pe 4h - un mesaj,
// până iese; botul NOU pe o monedă deja agitată - același fapt, titlul spune „bot nou”. Cifra e a Busolei (gridurile măsurate de ea),
// nu a monedei botului; intervalul vine gata scris (Alerte.pret, zecimalele Pionex).
const DIR_BOT = { long: "long", short: "short" };
export const busolaMiscare = (o) => ({ nivel: "atentie", cheie: "busola-miscare",
  titlu: o.nume + " " + (DIR_BOT[o.directie] || "neutru") + (Number(o.levier) > 0 ? " " + V(o.levier) + "×" : "") + " · Busola: " + (o.nou ? "bot nou pe monedă agitată" : "mai agitată ca de obicei"),
  mesaj: msg("Pe 4h, " + o.nume + " e mai agitată ca de obicei: după asta, gridurile măsurate de Busola au pierdut cel mai mult" + (o.cifra ? " (" + o.cifra + ")" : "") + ".",
    "Aș verifica stopul botului" + (o.interval ? " (gridul " + o.interval + ")" : "") + " și n-aș adăuga bani cât ține.") });
// rezumatul Busolei e vechi: paza tace - o notă doar în Radar, o dată pe rezumat
export const busolaVeche = (ore) => ({ nivel: "info", cheie: "busola-veche", doarRadar: true, titlu: "Busola: rezumatul are " + cate(ore, "oră", "ore"),
  mesaj: "Paza boților tace până vine un rezumat nou: pe date vechi nu anunț mișcarea." });

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

export const perechiOra = (nume, n, usdt) => ({ nivel: "info", titlu: "✅ " + nume + ": " + (n === 1 ? "o pereche" : cate(n, "pereche", "perechi")) + " în ultima oră, " + U2(usdt) + " din grile",
  mesaj: "Fiecare pereche e în Radar (Alerte); pe Discord vine un rezumat pe oră, ca alertele importante să nu se piardă printre ele." });

// f = Obiceiuri.frana(...) (obiectul: depasit, netZi, netSapt, rand, praguri)
// v100.70 (revizia pachetului 3, I3): din OBIECTUL Obiceiuri.frana - textul lui are deja titlul, actiunea si sumele cu punct (pe Discord
// ieseau de doua ori); aici: pragurile depasite, cu virgula, intr-o fraza. Un text vechi (string) ramane primit, fara titlu si actiune.
const DEP = { zi: (f) => "azi " + U2(f.netZi) + " (pragul tău: −" + V(f.praguri.zi) + ")", sapt: (f) => "pe 7 zile " + U2(f.netSapt) + " (pragul: −" + V(f.praguri.sapt) + ")",
  rand: (f) => cate(f.rand, "bot închis", "boți închiși") + " pe minus la rând (pragul: " + f.praguri.rand + ")" };
export const frana = (f) => {
  const parti = f && typeof f === "object" && Array.isArray(f.depasit) && f.praguri ? f.depasit.map((d) => (DEP[d.cod] ? DEP[d.cod](f) : d.text)).filter(Boolean) : [];
  const fapt = parti.length ? parti.join(", ") : String(f && typeof f === "object" ? f.text || "" : f || "").replace(/^Frâna contului: gata pe azi\s*—\s*/, "").replace(/\s*N-aș mai porni boți azi;.*$/, "");
  return { nivel: "critic", titlu: "🛑 Frâna contului: gata pe azi", mesaj: msg(fapt.charAt(0).toUpperCase() + fapt.slice(1).replace(/\.?\s*$/, "."), "N-aș mai porni boți azi (mâine, cu capul limpede); pragurile se schimbă în Radar → Grid → Poarta de pornire.") };
};
