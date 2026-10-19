// Mesajele compuse de colector (Discord, pagina alerts), intr-un modul pur - v100.66 (specul „sfaturi concise”, pachetul 3):
// garda textelor (scripts/garda-texte.mjs) le genereaza si le verifica, ca pe alertele din public/lib/alerte.js.
// Fiecare intoarce { nivel, titlu, mesaj } (fara retea, fara stare). v100.68: scrise concis - titlul ≤ 60, mesajul pe 2 randuri
// (faptul · „👉 ” actiunea la persoana I), virgula zecimala, fara majuscule de strigat.
// Cuvinte de care depinde codul: „nu mai poate citi” / „citește din nou” (TabloExtra.alertaRezolvata), „n-are plan” („Ce ai de făcut acum”).

// v100.76 (revizia ideilor): „1 bot”, „20 de boți”, „101 cazuri” - TextRo.cate; rezerva știe aceeași regulă (contextele fără TextRo)
function cate(n, sg, pl) { if (typeof TextRo !== "undefined" && TextRo.cate) return TextRo.cate(n, sg, pl); var k = Math.round(Number(n)), r = Math.abs(k) % 100; return !isFinite(k) ? "— " + pl : k === 1 ? "1 " + sg : k + (r >= 20 || (r === 0 && Math.abs(k) >= 100) ? " de " : " ") + pl; }
// v101.116 (auditul sever, 🔵12): regula lui - rezultatele cu O SINGURĂ zecimală (și pe Discord): „−21,3 USDT”, nu „−21,31”;
// sub 0,05 (dar nu zero) ⇒ „<0,1”, nu „0,0” (numele U2 a rămas din v100.66)
const U2 = (v) => { v = Number(v) || 0; const a = Math.abs(v); return (v >= 0 ? "+" : "−") + (a > 0 && a < 0.05 ? "<0,1" : a.toFixed(1).replace(".", ",")) + " USDT"; };
const V = (v) => String(Math.round(Math.abs(Number(v)) * 10) / 10).replace(".", ",");
const V1 = (v) => Math.abs(Number(v)).toFixed(1).replace(".", ",");   // v101.70: rezultatele cu o singură zecimală
const scurt = (s, n) => { s = String(s || ""); return s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…"; };
const msg = (fapt, act) => fapt + (act ? "\n👉 " + act : "");

// coada Discord: mesajul plecat cu intarziere
export const intarziat = (titlu, minute) => titlu + " (întârziat " + minute + " min)";

export const serverOprit = (minute) => ({ nivel: "critic", titlu: "Crypto Radar oprit: serverul de acasă nu mai răspunde",
  mesaj: msg("De ~" + cate(minute, "minut", "minute") + " serverul Radarului (fereastra neagră, :8788) nu răspunde, deci și colectorul s-a oprit: alertele boților și ale acțiunilor nu mai vin.",
    "Aș porni PORNESTE-CRYPTO-RADAR.bat; stopurile din Pionex merg și fără Radar.") });

export const citireRea = (minute, eroare) => ({ nivel: "critic", titlu: "Crypto Radar nu mai poate citi botul",
  mesaj: "De " + cate(minute, "minut", "minute") + " (" + scurt(eroare, 60) + ") alertele nu mai sunt de încredere până se rezolvă." });
export const citireDinNou = () => ({ nivel: "info", titlu: "Crypto Radar citește din nou botul", mesaj: "Alertele merg din nou." });
// v101.116 (auditul sever, S1): serverul respinge colectorul pe PAROLĂ (AUTH_*), nu pe ritm - înainte trecea drept „limită”, în tăcere
export const authRespins = (minute, cod) => ({ nivel: "critic", titlu: "Serverul Radarului respinge colectorul",
  mesaj: msg("De " + cate(minute, "minut", "minute") + " serverul de acasă refuză parola colectorului (" + scurt(cod, 40) + "): alertele boților și ale acțiunilor nu mai vin.",
    "Aș închide taburile Radarului rămase cu parola veche și aș reporni PORNESTE-CRYPTO-RADAR.bat.") });
// v101.116 (auditul sever, C3): Pionex dă lista boților porniți goală (results:null), deși știu boți porniți - bucla alertelor e oarbă
export const botiNevazuti = (minute, nume) => ({ nivel: "critic", titlu: "Crypto Radar nu-ți mai vede boții",
  mesaj: msg("De " + cate(minute, "minut", "minute") + " Pionex îmi dă lista boților goală, deși știu " + cate((nume || []).length, "bot pornit", "boți porniți") + " (" + scurt((nume || []).join(", "), 80) + "): alertele de lichidare, stop și plan nu merg.",
    "Aș verifica boții direct în aplicația Pionex; stopurile puse în Pionex merg și fără Radar.") });
export const botiVazutiIar = () => ({ nivel: "info", titlu: "Crypto Radar îți vede iar boții", mesaj: "Lista din Pionex a revenit: alertele de lichidare, stop și plan merg din nou." });
// audit 19.10: tickerele PERP lipsesc ⇒ distanța până la lichidare nu se mai calculează și alerta de lichidare tace (o dată, apoi la revenire)
export const lichidareOarba = (nume, minute, motiv) => ({ nivel: "critic", titlu: scurt((nume || []).join(", ") || "Botul", 28) + ": nu mai pot judeca lichidarea",
  mesaj: msg("Pionex nu dă prețurile futures de " + Math.max(1, Math.round(Number(minute) || 0)) + " min" + (motiv ? " (" + scurt(motiv, 60) + ")" : "") + ": distanța până la lichidare nu se mai calculează, deci alerta de lichidare tace.",
    "Aș urmări lichidarea direct în aplicația Pionex până revin prețurile.") });
export const lichidareVedeIar = (nume) => ({ nivel: "info", titlu: "Prețurile futures au revenit", mesaj: "Pot judeca din nou lichidarea" + ((nume || []).length ? " la " + scurt(nume.join(", "), 80) : "") + "." });

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
// v101.91 (I-572): Busola a trecut pe „invers față de botul tău” (direcția ei pe 4h, nedovedită) - după 2 rezumate la rând
export const busolaDirectie = (o) => ({ nivel: "atentie", cheie: "busola-directie",
  titlu: o.nume + " " + (DIR_BOT[String(o.directie || "").toLowerCase()] || "neutru") + (Number(o.levier) > 0 ? " " + V(o.levier) + "×" : "") + " · Busola: înclină " + o.spre + ", invers față de bot",
  mesaj: msg("Pe 4h Busola e " + o.text + ".", "E o înclinare nedovedită (Busola nu prezice direcția): n-aș adăuga bani și aș verifica stopul; nu e un semnal de închidere.") });
// v101.91 (I-572): BTC s-a mișcat ≥ 2% în 24 h, moneda botului merge cu BTC (DA) și botul e CONTRA - după 2 rezumate la rând
export const busolaBtc = (o) => ({ nivel: "atentie", cheie: "busola-btc",
  titlu: o.nume + " " + (DIR_BOT[String(o.directie || "").toLowerCase()] || "neutru") + (Number(o.levier) > 0 ? " " + V(o.levier) + "×" : "") + " · " + o.btc + ", botul tău e CONTRA",
  mesaj: msg(o.text + ".", "Legătura e măsurată pe ultimele 30 de zile; nu e o prezicere că BTC continuă. Aș verifica stopul și n-aș adăuga bani cât ține.") });
// v101.107 (el 13.10: „fă idei”): în pândă (150 perp-uri) moneda botului e pe partea cealaltă - o dată pe episod, cel mult la 24 h
export const pandaContra = (o) => ({ nivel: "atentie", cheie: "panda-contra",
  titlu: o.nume + " " + (DIR_BOT[String(o.directie || "").toLowerCase()] || "neutru") + (Number(o.levier) > 0 ? " " + V(o.levier) + "×" : "") + " · pânda: " + o.text + ", botul tău e CONTRA",
  mesaj: msg("În pânda din Sugestii (150 perp-uri Binance, nu Pionex), " + o.text + "; direcția = randamentul pe 84 de zile, ca în PAZNIC." + (o.lich ? " " + o.lich : ""),"Direcția pe 84 de zile nu e dovedită ca semnal: n-aș adăuga bani și aș verifica stopul; nu e un semnal de închidere.") });
// v101.92 (I-578): graficul pe 4h, Busola și Monte Carlo spun toate „contra botului tău” - un singur mesaj, în locul celor separate
export const busolaVoci = (o) => ({ nivel: "atentie", cheie: "busola-voci",
  titlu: o.nume + " " + (DIR_BOT[String(o.directie || "").toLowerCase()] || "neutru") + (Number(o.levier) > 0 ? " " + V(o.levier) + "×" : "") + " · " + (o.nContra >= 3 ? "toate vocile contra: " : o.nContra + " din " + o.nVoci + " voci contra: ") + o.cine,
  mesaj: msg(o.text + ".", "Vocile care s-au pronunțat sunt pe aceeași parte, niciuna dovedită: aș verifica stopul și n-aș adăuga bani; nu e un semnal de închidere.") });   /* revizia: numărul real de voci */
// rezumatul Busolei e vechi: paza tace - o notă doar în Radar, o dată pe rezumat
// v100.207 (auditul Busolei): omul mort — pe Discord, cu ce să faci; critic peste 3 h (ziua măsurarea e orară)
export const busolaVeche = (ore, pragOre) => ({ nivel: ore >= 3 && pragOre < 3 ? "critic" : "atentie", cheie: "busola-veche", doarRadar: false,
  titlu: "Busola n-a mai măsurat de " + cate(Math.floor(ore), "oră", "ore") + (pragOre < 3 ? " (ziua măsoară orar)" : " (noaptea la 4 ore)"),
  mesaj: "PC-ul e oprit, sarcina nu rulează sau wrangler s-a agățat ori login-ul a expirat; paza boților tace, Busola arată date vechi.\n"
    + "👉 Aș porni PC-ul sau MASOARA-SI-URCA.bat; la 401 aș rula npx wrangler login în busola." });

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
// v100.175 (revizia v100.173): arhiva boților nu vine de ore ⇒ frâna nu poate judeca; tăcerea ar părea „totul e bine”
export const franaFaraArhiva = (ore) => ({ nivel: "atentie", titlu: "Frâna contului nu poate judeca", mesaj: msg("Arhiva boților închiși nu vine de " + cate(Math.max(1, Math.round(ore)), "oră", "ore") + ", deci nu știu cât ai pierdut azi și pe 7 zile.", "Până revine, aș număra singur pierderile de azi înainte să pornesc un bot nou.") });
// v100.176 (contul întreg, reconcilierea cu brokerii): abaterile dintre ce știe Radarul și ce raportează T212 / Pionex
const nrBuc = (x) => (Math.abs(x) >= 100 ? Math.round(x).toLocaleString("ro-RO") : String(Math.round(x * 1000) / 1000).replace(".", ","));
export const reconciliereT212 = (a) => ({ nivel: "atentie", titlu: ("Trading 212 ≠ jurnalul Radarului: " + String(a.ticker).replace(/_US_EQ$|_EQ$/, "")).slice(0, 60),
  mesaj: msg("T212 spune " + nrBuc(a.broker) + " buc, jurnalul Radarului " + nrBuc(a.radar) + " buc: " + a.motiv + ". Statistica, Declarația și riscul pe acest simbol ies greșit până se repară.", "Aș deschide istoricul T212 la simbolul ăsta și aș verifica ultimele ordine.") });
export const reconciliereArhiva = (r) => ({ nivel: "atentie", titlu: "Arhiva boților nu are toți boții închiși",
  mesaj: msg(cate(r.lipsa.length, "bot închis", "boți închiși") + " din prima pagină Pionex lipsesc din arhivă; raportul de duminică, frâna și riscul îi numără greșit.", "Aș lăsa colectorul pornit o oră: tura arhivei îi adaugă singură; dacă rămân, spune-mi.") });
export const reconciliereUrmarire = (r) => ({ nivel: "critic", titlu: "Un bot pornit nu mai e urmărit de Radar",
  mesaj: msg(r.lipsa.map((x) => x.nume || x.id).join(", ") + ": pornit în Pionex, dar fără istoric în Radar de peste 20 de minute - alertele lui (lichidare, plan) nu vin.", "Aș verifica acum botul direct în Pionex și aș reporni colectorul.") });
// v100.179 (disciplina): botul afară din bandă peste pragul LUI, garda încălcată, lecția săptămânii
const pc0 = (x) => (x >= 0 ? "+" : "−") + Math.abs(x * 100).toFixed(1).replace(".", ",") + "%";
export const afaraDinBanda = (nume, ore, r) => ({ nivel: "atentie", titlu: (nume + ": afară din bandă de " + cate(Math.round(ore), "oră", "ore")).slice(0, 60),
  mesaj: msg("Din boții tăi închiși, după " + r.h + " h afară doar " + Math.round(r.intoarse * 100) + "% s-au mai întors în bandă în 24 h" + (r.miscareImpotriva !== null ? ", iar prețul a mers în medie încă " + pc0(r.miscareImpotriva) + " împotriva botului" : "") + ".", "Aș închide botul sau i-aș muta banda acum, nu aș mai aștepta.") });
export const garda = (g) => ({ nivel: "atentie", titlu: ("Gardă încălcată: " + g.titlu).slice(0, 60), mesaj: msg((g.detaliu ? g.detaliu + ". " : "") + "Garda vine din " + (g.sursa || "datele tale") + ".", "Aș readuce contul sub prag înainte de orice poziție nouă.") });
export const lectiaSaptamanii = (l, ver) => {
  const top = (l.top || []).map((d, i) => (i + 1) + ". " + d.ce + ": −" + Math.round(d.cost).toLocaleString("ro-RO") + " lei - " + d.motive.map((m) => m.text).join("; ")).join("\n");
  const v = ver ? (ver.respectata ? "Regula de săptămâna trecută („" + ver.text + "”): respectată ✓." : "Regula de săptămâna trecută („" + ver.text + "”): încălcată de " + cate(ver.incalcari, "dată", "ori") + ".") + "\n" : "";
  return { nivel: "info", titlu: "📘 Lecția săptămânii", mesaj: msg(v + (top ? "Cele mai scumpe decizii:\n" + top : "Săptămâna asta nicio pierdere n-a încălcat o regulă a ta."), l.regula ? "Regula pentru săptămâna care vine: " + l.regula.text + "." : "Aș păstra regulile de până acum.") };
};
export const frana = (f) => {
  const parti = f && typeof f === "object" && Array.isArray(f.depasit) && f.praguri ? f.depasit.map((d) => (DEP[d.cod] ? DEP[d.cod](f) : d.text)).filter(Boolean) : [];
  const fapt = parti.length ? parti.join(", ") : String(f && typeof f === "object" ? f.text || "" : f || "").replace(/^Frâna contului: gata pe azi\s*—\s*/, "").replace(/\s*N-aș mai porni boți azi;.*$/, "");
  return { nivel: "critic", titlu: "🛑 Frâna contului: gata pe azi", mesaj: msg(fapt.charAt(0).toUpperCase() + fapt.slice(1).replace(/\.?\s*$/, "."), "N-aș mai porni boți azi (mâine, cu capul limpede); pragurile se schimbă în Radar → Grid → Poarta de pornire.") };
};
