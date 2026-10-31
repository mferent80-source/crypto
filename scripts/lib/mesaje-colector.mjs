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

// v100.259 (auditul 23.10, punctul 4): colectorul nu mai iese - așteaptă serverul și reia singur; la revenire, serverRevenit
export const serverOprit = (minute) => ({ nivel: "critic", titlu: "Crypto Radar oprit: serverul de acasă nu mai răspunde",
  mesaj: msg("De ~" + cate(minute, "minut", "minute") + " serverul Radarului (:8788) nu răspunde: alertele nu mai vin, iar colectorul reia singur când revine.",
    "Aș porni PORNESTE-CRYPTO-RADAR.bat; stopurile din Pionex merg și fără Radar.") });
export const serverRevenit = () => ({ nivel: "info", titlu: "Crypto Radar: serverul de acasă răspunde din nou", mesaj: "Colectorul citește iar boții; alertele merg din nou." });

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

// v100.259 (auditul 23.10, punctul 13): Radarul citește cel mult 100 de boți porniți (10 pagini Pionex) - cei în plus n-au alerte
export const botiTrunchiati = (n) => ({ nivel: "atentie", titlu: "Peste " + cate(n, "bot", "boți") + " porniți: cei în plus n-au alerte",
  mesaj: msg("Pionex dă boții pe pagini de câte 10, iar Radarul citește cel mult 10 pagini, deci boții de după primii " + cate(n, "bot", "boți") + " nu sunt păziți.",
    "Aș închide boții de care nu mai am nevoie, ca toți să fie păziți.") });

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
// v100.281: raportul lung pe mai multe mesaje - Discord taie descrierea la 2000 (din 25.10 se pierdeau rândurile Trend și acțiunile);
// rupt doar între rânduri, fiecare parte ≤ max; scurt ⇒ un singur mesaj, exact ca raport()
export const raportParti = (data, linii, max = 1900) => {
  const parti = []; let cur = [];
  for (const x of Array.isArray(linii) ? linii : []) { const s = String(x); if (cur.length && (cur.join("\n") + "\n" + s).length > max) { parti.push(cur); cur = []; } cur.push(s); }
  if (cur.length || !parti.length) parti.push(cur);
  return parti.map((p, i) => ({ nivel: "info", titlu: "Raportul de duminică (" + data + ")" + (parti.length > 1 ? " · " + (i + 1) + "/" + parti.length : ""), mesaj: p.join("\n") }));
};
export const autopsie = (data, linii) => ({ nivel: "info", titlu: "Autopsia acțiunilor (" + data + ")", mesaj: linii.join("\n") });

export const legat = () => ({ nivel: "info", titlu: "Crypto Radar: alertele sunt legate",
  mesaj: "De aici vin alertele botului: lichidarea aproape, Pionex în stare anormală, prețul ieșit din grid, piața pe 4 ore contra botului, mișcarea mare." });

export const perechiOra = (nume, n, usdt) => ({ nivel: "info", titlu: "✅ " + nume + ": " + (n === 1 ? "o pereche" : cate(n, "pereche", "perechi")) + " în ultima oră, " + U2(usdt) + " din grile",
  mesaj: "Fiecare pereche e în Radar (Alerte); pe Discord vine un rezumat pe oră, ca alertele importante să nu se piardă printre ele." });

// f = Obiceiuri.frana(...) (obiectul: depasit, netZi, netSapt, rand, praguri)
// v100.70 (revizia pachetului 3, I3): din OBIECTUL Obiceiuri.frana - textul lui are deja titlul, actiunea si sumele cu punct (pe Discord
// ieseau de doua ori); aici: pragurile depasite, cu virgula, intr-o fraza. Un text vechi (string) ramane primit, fara titlu si actiune.
const DEP = { zi: (f) => "azi " + U2(f.netZi) + " (pragul tău: −" + V(f.praguri.zi) + ")", sapt: (f) => "pe 7 zile " + U2(f.netSapt) + " (pragul: −" + V(f.praguri.sapt) + ")",
  rand: (f) => cate(f.rand, "bot închis", "boți închiși") + " pe minus la rând (pragul: " + f.praguri.rand + ")",
  boti: (f) => cate(f.pornitiAzi, "bot pornit", "boți porniți") + " azi (pragul: " + f.praguri.boti + ")" };   /* v100.280 */
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
  // audit 19.10 (6): intervalul Wilson 95% și cazurile lângă procent; mișcarea e mediana, nu „în medie”
  mesaj: msg("Din boții tăi închiși, după " + r.h + " h afară doar " + Math.round(r.intoarse * 100) + "% s-au mai întors în 24 h" + (r.intoarseLo != null && r.intoarseHi != null ? " (interval 95%: " + Math.round(r.intoarseLo * 100) + "–" + Math.round(r.intoarseHi * 100) + "%" + (r.n > 0 ? ", " + cate(r.n, "caz", "cazuri") : "") + ")" : "") + (r.miscareImpotriva !== null && r.miscareImpotriva !== undefined ? ", iar prețul a mers încă " + pc0(r.miscareImpotriva) + " împotrivă (mediana)" : "") + ".", "Aș închide botul sau i-aș muta banda acum, nu aș mai aștepta.") });
// v100.280 (el, 30.10: „fă tot” - analiza comportamentală): treapta timpurie a benzii - primul prag (≥ 30 de cazuri) după care sub jumătate
// dintre boții lui s-au mai întors (dv); regula de închidere rămâne r (sub 30%). Pe istoria lui, boții ținuți peste 6 h au făcut 56% din pierdere.
export const afaraDinBandaDevreme = (nume, ore, dv, r) => ({ nivel: "atentie", titlu: (nume + ": de " + cate(Math.round(ore), "oră", "ore") + " afară din grilă").slice(0, 60),
  mesaj: msg("Din boții tăi închiși, după " + dv.h + " h afară doar " + Math.round(dv.intoarse * 100) + "% s-au mai întors în 24 h" + (dv.n > 0 ? " (" + cate(dv.n, "caz", "cazuri") + ")" : "") + (r ? "; după " + r.h + " h, " + Math.round(r.intoarse * 100) + "%" : "") + ".",
    "Aș hotărî acum, nu " + (r ? "la " + r.h + " h" : "mai târziu") + ": îl închid sau îi mut banda.") });
export const garda = (g) => ({ nivel: "atentie", titlu: ("Gardă încălcată: " + g.titlu).slice(0, 60), mesaj: msg((g.detaliu ? g.detaliu + ". " : "") + "Garda vine din " + (g.sursa || "datele tale") + ".", "Aș readuce contul sub prag înainte de orice poziție nouă.") });
export const lectiaSaptamanii = (l, ver) => {
  const top = (l.top || []).map((d, i) => (i + 1) + ". " + d.ce + ": −" + Math.round(d.cost).toLocaleString("ro-RO") + " lei - " + d.motive.map((m) => m.text).join("; ")).join("\n");
  const v = ver ? (ver.respectata ? "Regula de săptămâna trecută („" + ver.text + "”): respectată ✓." : "Regula de săptămâna trecută („" + ver.text + "”): încălcată de " + cate(ver.incalcari, "dată", "ori") + ".") + "\n" : "";
  return { nivel: "info", titlu: "📘 Lecția săptămânii", mesaj: msg(v + (top ? "Cele mai scumpe decizii:\n" + top : "Săptămâna asta nicio pierdere n-a încălcat o regulă a ta."), l.regula ? "Regula pentru săptămâna care vine: " + l.regula.text + "." : "Aș păstra regulile de până acum.") };
};
// v101.127 (scorul sezonului, ideea 2): pauza la N pierderi la rând și țintele atinse - din ScorSezon.calc (s), o dată pe episod / sezon
// v101.128: și pentru Trading 212 (s.piata = "t212", s.moneda = "lei", „trade-uri” în loc de „boți”)
// v100.272: procentul scorului cu o zecimală, lipit („58,3%”), ca pe pagina scorului (ScorSezon) - era „58 %”
const scPc = (x) => (Math.round(Number(x) * 1000) / 10).toFixed(1).replace(".", ",") + "%";
const scM = (s) => (s.moneda || "USDT"), scU =(v, s) => U2(v).replace(/ USDT$/, " " + scM(s)), scNume = (s) => (s.piata === "t212" ? "Trading 212" : "Pionex"), scFel = (s) => (s.piata === "t212" ? ["trade", "trade-uri"] : ["bot", "boți"]);
export const scorPauza = (s) => ({ nivel: "atentie", titlu: "Scorul " + scNume(s) + ": " + cate(s.serie.n, "pierdere", "pierderi") + " la rând - pauză",
  mesaj: msg("Sezonul din " + ziRo(s.start) + ": " + s.win + " win / " + s.loss + " loss, net " + scU(s.net, s) + " (ținta ta: cel mult " + s.obiectiv.serie + " la rând).",
    "N-aș mai porni alt " + scFel(s)[0] + " azi; mâine, cu capul limpede, m-aș uita de ce au pierdut " + (s.piata === "t212" ? "ultimele " : "ultimii ") + s.serie.n + ".") });
export const scorTinta = (s, fel) => ({ nivel: "info", titlu: "Scorul " + scNume(s) + ": " + (fel === "net" ? "netul țintă atins (" + scU(s.net, s) + ")" : "rata țintă atinsă (" + scPc(s.rata) + ")"),
  mesaj: msg("Sezonul din " + ziRo(s.start) + ": " + s.win + " win / " + s.loss + " loss din " + cate(s.n, scFel(s)[0], scFel(s)[1]) + ", net " + scU(s.net, s) + (fel === "net" ? " față de ținta +" + V(s.obiectiv.net) + " " + scM(s) + "." : " - rata " + scPc(s.rata) + " față de ținta " + scPc(s.obiectiv.rata) + "."),
    fel === "net" ? "Aș păstra ce am câștigat: aceleași sume, nu mai mari, și aș ridica ținta doar după încă 10 " + scFel(s)[1] + "." : "Aș urmări netul, nu rata: o pierdere mare șterge cinci câștiguri mici.") });
const ziRo = (t) => { const d = new Date(t); return new Intl.DateTimeFormat("ro-RO", { timeZone: "Europe/Bucharest", day: "2-digit", month: "2-digit" }).format(d); };
export const frana = (f) => {
  const parti = f && typeof f === "object" && Array.isArray(f.depasit) && f.praguri ? f.depasit.map((d) => (DEP[d.cod] ? DEP[d.cod](f) : d.text)).filter(Boolean) : [];
  const fapt = parti.length ? parti.join(", ") : String(f && typeof f === "object" ? f.text || "" : f || "").replace(/^Frâna contului: gata pe azi\s*—\s*/, "").replace(/\s*N-aș mai porni boți azi;.*$/, "");
  return { nivel: "critic", titlu: "🛑 Frâna contului: gata pe azi", mesaj: msg(fapt.charAt(0).toUpperCase() + fapt.slice(1).replace(/\.?\s*$/, "."), "N-aș mai porni boți azi (mâine, cu capul limpede); pragurile se schimbă în Radar → Grid → Poarta de pornire.") };
};

// ---------------- v100.281 / colector v101.153 (el, 31.10): evaluarea fiecărui bot închis, în canalul LUI separat ----------------
// ev = Comportament.evalueaza(...) - deciziile (✅ / ❌ cu cifrele lui), verdictul 2×2 (decizii × rezultat) și un sfat; f = Obiceiuri.frana /
// franaLaPornire. Fiecare rând ≤ 160 (garda „raport”), sfatul „👉 Aș…” ≤ 110.
const num = (v) => (v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));
const ordinal = (n) => (Math.round(Number(n)) === 1 ? "primul" : "al " + Math.round(Number(n)) + "-lea");
const mare = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const durOre = (h) => { const m = Math.round(Number(h) * 60); return m < 60 ? Math.max(1, m) + " min" : Math.floor(m / 60) + " h" + (m % 60 ? " " + (m % 60) + " min" : ""); };
const pc = (x) => Math.round(Number(x) * 100) + "%";
const ori = (a, b) => (Math.abs(Number(a)) / Number(b)).toFixed(1).replace(".", ",") + "×";
const dirTxt = (d) => (d === "long" || d === "short" ? " " + d : "");
const VERDICT = { bune: "decizii bune", ghinion: "decizii bune, ghinion", noroc: "câștig cu noroc", cost: "greșeala a costat" };
// pragurile frânei depășite, mereu în aceeași ordine (boții de azi, la rând, ziua, 7 zile) - scurte, ca și toate patru să încapă în 160;
// fara = fără pragurile în bani (praguri și sume foarte mari)
function franaParti(f, cuBoti, fara) {
  const dep = new Set(((f && f.depasit) || []).map((d) => d && d.cod)), P = (f && f.praguri) || {}, l = [];
  if (cuBoti && dep.has("boti")) l.push(ordinal((num(f.pornitiAzi) || 0) + 1) + " bot azi (pragul " + P.boti + ")");
  if (dep.has("rand")) l.push(cate(f.rand, "pierdere", "pierderi") + " la rând (pauza la " + P.rand + ")");
  if (dep.has("zi")) l.push("ziua " + U2(f.netZi) + (fara ? "" : " (pragul −" + V(P.zi) + ")"));
  if (dep.has("sapt")) l.push("7 zile " + U2(f.netSapt) + (fara ? "" : " (pragul −" + V(P.sapt) + ")"));
  return l;
}
function textDecizie(d) {
  if (d.cod === "boti") return mare(ordinal(d.n)) + " bot pornit azi, " + (d.ok ? "în pragul tău de " + d.prag : "peste pragul tău de " + d.prag
    + (d.dovezi && d.dovezi.peste.pe < d.dovezi.sub.pe ? ": zilele tale cu peste " + cate(d.dovezi.prag, "bot", "boți") + " au dat " + U2(d.dovezi.peste.pe) + "/zi, celelalte " + U2(d.dovezi.sub.pe) + "/zi" : "")) + ".";
  if (d.cod === "frana") return d.ok ? "Pierderile erau sub pragurile frânei când l-ai pornit." : "Pornit cu frâna trasă: " + franaParti(d.frana, false).join(", ") + ".";
  if (d.cod === "banda") return d.ok ? "Ai închis la " + durOre(d.ore) + " după ieșirea prețului din grilă, înainte de pragul de " + d.dv.h + " h."
    : "Ai ținut " + durOre(d.ore) + " cu prețul în afara grilei: la tine, după " + d.dv.h + " h se mai întorc doar " + pc(d.dv.intoarse) + (d.r && d.ore >= d.r.h ? ", după " + d.r.h + " h " + pc(d.r.intoarse) : "") + ".";
  if (d.cod === "minute") {
    const g = num(d.grile), c = num(d.comisioane) || 0, dm = d.dovezi;
    return "Închis după " + Math.max(1, Math.round(d.minute)) + " min: comisioanele " + U2(c) + (g !== null && g > 0 ? " = " + ori(c, g) + " cât au prins grilele (" + U2(g) + ")" : ", grilele n-au prins nimic")
      + (dm && dm.grile > 0 ? "; la tine, sub " + d.prag + " min comisioanele sunt " + ori(dm.comisioane, dm.grile) + " grilele" : "") + ".";
  }
  return "Lichidat: botul n-a avut un stop înaintea lichidării.";
}
function sfatEvaluare(ev) {
  const d = ev.decizii.find((x) => x.cod === ev.sfat && !x.ok);
  if (!d) return ev.net < 0 ? "Aș repeta la fel: o pierdere cu decizii bune nu cere nicio schimbare." : "Aș porni la fel data viitoare: deciziile au fost pe regulile tale.";
  if (d.cod === "lichidare") return "Aș pune stopul înaintea lichidării, de la pornire.";
  if (d.cod === "boti") return "Aș număra boții înainte să pornesc: după " + ordinal(d.prag) + ", gata ziua.";
  if (d.cod === "banda") return "Aș hotărî la " + d.dv.h + " h cu prețul în afara grilei: îl închid sau îi mut banda.";
  if (d.cod === "frana") return d.rand ? "Aș închide Pionex după " + cate(d.rand.prag, "pierdere", "pierderi") + " la rând și aș relua mâine."
    : d.zi ? "Aș lăsa boții pe mâine când ziua trece de −" + V(d.zi.prag) + " USDT."
    : "Aș porni cu 7 zile sub −" + V(d.sapt.prag) + " doar dacă pragul mai e al meu; altfel l-aș schimba în Poartă.";
  return "Aș porni gridul doar când îl las să lucreze: în minute prinde puține grile, comisioanele se plătesc oricum.";
}
export const evaluareBot = (ev) => {
  const t = ev.t || {}, net = Number(ev.net) || 0, dur = num(t.inchis) !== null && num(t.pornit) !== null && t.inchis > t.pornit ? durOre((t.inchis - t.pornit) / 3600000) : null;
  const g = num(t.grile), p = num(t.pozitie), cf = (num(t.comisioane) || 0) + (num(t.funding) || 0);
  const L = [(dur ? "Ținut " + dur : "Botul") + (g !== null && p !== null ? ": grilele " + U2(g) + ", poziția " + U2(p) + ", comisioane și funding " + U2(cf) : "") + " ⇒ net " + U2(net) + "."];
  for (const d of ev.decizii) if (d.ok) L.push("✅ " + textDecizie(d));
  for (const d of ev.decizii) if (!d.ok) L.push("❌ " + textDecizie(d));
  // v100.282 (ideea 3): luna asta pe regulile încălcate de bot (din data/evaluari.jsonl, cu el inclus) - de la 2 boți încolo, rupt între reguli
  const lun = ev.luna ? ORDINE_REGULI.filter((c) => ev.luna[c] && ev.luna[c].n >= 2 && ev.decizii.some((d) => d.cod === c && !d.ok)).map((c) => eticheta(c, ev.luna[c].n) + " (" + U2(ev.luna[c].net) + ")") : [];
  if (lun.length) L.push(...rupeBucati("📅 Luna asta: ", lun, 160));
  if (ev.verdict === "ghinion") L.push("⚖️ Pe regulile tale n-ai greșit nimic: pierderea vine din piață, nu din decizii.");
  if (ev.verdict === "noroc") L.push("⚖️ Câștigul a venit cu reguli încălcate: de data asta piața te-a ajutat, regula rămâne.");
  L.push("👉 " + sfatEvaluare(ev));
  return { nivel: ev.nivel, cheie: "evaluare", titlu: (String(t.moneda || "Botul") + dirTxt(t.dir) + ": " + VERDICT[ev.verdict] + " " + U2(net)).slice(0, 60), mesaj: L.join("\n") };
};
// botul pornit cu frâna trasă (f = Obiceiuri.franaLaPornire): pe acesta nu-l închid în minute (comisioanele), doar nu mai pornesc altul
export const pornitCuFrana = (nume, dir, f) => {
  let fapt = "Frâna trasă la pornire: " + franaParti(f, true).join(", ") + ".";
  if (fapt.length > 160) fapt = "Frâna trasă la pornire: " + franaParti(f, true, true).join(", ") + ".";   /* revizia: praguri și sume foarte mari */
  return { nivel: "atentie", cheie: "pornit-frana", titlu: (String(nume || "Botul") + dirTxt(dir) + ": pornit cu frâna trasă").slice(0, 60), mesaj: msg(fapt, "N-aș mai porni altul azi; pe acesta l-aș lăsa să lucreze, cu stopul pus.") };
};
// frâna pe 7 zile trasă de peste 3 zile la rând: trasă zilnic, nu mai oprește nimic - pragul de acum mai e al lui?
export const pragSaptIntrebare = (f, zile) => ({ nivel: "atentie", cheie: "frana-sapt", titlu: "Frâna pe 7 zile e trasă de " + cate(zile, "zi", "zile") + " la rând",
  mesaj: msg("Ultimele 7 zile: " + U2(f.netSapt) + ", pragul tău e −" + V(f.praguri.sapt) + " USDT; trasă zile la rând, frâna nu mai spune nimic nou.",
    "Aș hotărî azi: țin pauza până revine săptămâna sau pun în Poartă un prag pe care îl respect.") });
export const legatEvaluari = () => ({ nivel: "info", titlu: "Crypto Radar: aici vin evaluările boților",
  mesaj: "După fiecare bot închis: ce a mers, ce de îndreptat și un sfat, pe regulile și cifrele tale; tot aici, pornirile cu frâna trasă." });

// v100.282: regulile, pe nume (aceeași ordine peste tot) - „23 de boți porniți cu frâna trasă”, „1 bot închis în minute”
export const ORDINE_REGULI = ["boti", "frana", "banda", "minute", "lichidare"];
const ETICHETA = { boti: ["pornit peste pragul zilei", "porniți peste pragul zilei"], frana: ["pornit cu frâna trasă", "porniți cu frâna trasă"], banda: ["ținut în afara grilei", "ținuți în afara grilei"], minute: ["închis în minute", "închiși în minute"], lichidare: ["lichidat", "lichidați"] };
export const eticheta = (cod, n) => { const e = ETICHETA[cod] || [cod, cod]; return cate(n, "bot " + e[0], "boți " + e[1]); };
// rânduri ≤ max, rupte doar între bucăți (o bucată nu se desparte); rândul continuat se termină în „ ·”
export function rupeBucati(cap, bucati, max) {
  const out = []; let rand = cap + bucati[0];
  for (let i = 1; i < bucati.length; i++) { if ((rand + " · " + bucati[i] + " ·").length > max) { out.push(rand + " ·"); rand = bucati[i]; } else rand += " · " + bucati[i]; }
  out.push(rand + "."); return out;
}
// v100.282: webhook-ul evaluărilor stricat (șters / greșit / lipsă) - o notă doar în Radar (pagina Alerte), o dată pe problemă
export const canalEvaluariStricat = (status) => ({ nivel: "atentie", doarRadar: true, cheie: "canal-evaluari", titlu: "Canalul evaluărilor nu primește mesaje",
  mesaj: status === "lipsă" ? msg("DISCORD_WEBHOOK_EVALUARI lipsește din .dev.vars: evaluările boților nu pleacă nicăieri.", "Aș pune webhook-ul canalului de evaluări în .dev.vars și aș reporni colectorul.")
    : msg("Discord răspunde " + status + " la webhook-ul evaluărilor (șters sau greșit): evaluările stau la coadă cel mult 24 h.", "Aș pune un webhook nou în .dev.vars (DISCORD_WEBHOOK_EVALUARI) și aș reporni colectorul.") });

// ---------------- v100.283 / colector v101.155 (el, 31.10: „ok, fă” - ideile 1, 2) ----------------
const LUNI = ["ianuarie", "februarie", "martie", "aprilie", "mai", "iunie", "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie"];
export const numeLuna = (cheie) => LUNI[Number(String(cheie).slice(5, 7)) - 1] || String(cheie);
const grup = (g) => (g && g.n ? cate(g.n, "bot", "boți") + " (" + U2(g.net) + ")" : "niciunul");
const SFAT_SEARA = {
  boti: (prag) => "Aș număra boții mâine înainte să pornesc: după " + ordinal(prag) + ", gata ziua.",
  frana: () => "Aș porni mâine doar cu frâna liberă; dacă pragul pe 7 zile nu mai e al meu, îl schimb în Poartă.",
  banda: () => "Aș hotărî mâine la timp: când prețul iese din grilă, îl închid sau îi mut banda.",
  minute: () => "Aș porni mâine gridul doar când îl las să lucreze, nu ca să-l închid în minute.",
  lichidare: () => "Aș pune mâine stopul înaintea lichidării, chiar de la pornire.",
};
// (2) seara pe scurt (s = Comportament.searaZilei): câți azi, câți în regulă, regula cea mai deasă, un sfat pentru mâine
export const searaPeScurt = (s, prag) => {
  const tot = s.bune.n === s.n ? (s.n === 1 ? "în regulă" : "toți în regulă") : s.bune.n ? s.bune.n + " în regulă" : "niciunul în regulă";
  const L = ["În regulă: " + grup(s.bune) + " · cu reguli încălcate: " + grup(s.rele) + "."];
  if (s.top && s.pe[s.top]) L.push("Cel mai des: " + eticheta(s.top, s.pe[s.top].n) + " (" + U2(s.pe[s.top].net) + ").");
  L.push("👉 " + (s.top && SFAT_SEARA[s.top] ? SFAT_SEARA[s.top](prag) : "Aș păstra ziua de azi ca reper: toate deciziile au fost în regulile tale."));
  return { nivel: s.rele.n ? "atentie" : "info", cheie: "seara", titlu: "Seara: " + cate(s.n, "bot închis", "boți închiși") + " azi, " + tot, mesaj: L.join("\n") };
};
// (1) oglinda lunii (a = luna trecută, b = cea dinainte; Comportament.oglindaLunii): cele 5 obiceiuri, cu câți / % / net, ce s-a rărit și ce
// s-a îndesit (după pondere), un singur obicei de lucrat - cel ai cărui boți au dat cel mai prost. Descriptiv, fără „dovedit”.
const OBICEIURI = [
  { k: "frana", rand: "Porniți cu frâna trasă", nume: "pornirile cu frâna trasă", pc: true },
  { k: "lungi", rand: "Ținuți peste 6 h", nume: "boții ținuți peste 6 h", pc: true },
  { k: "minute", rand: "Închiși în minute", nume: "închiderile în minute", pc: true },
  { k: "lichidati", rand: "Lichidați", nume: "lichidările", pc: false },
];
export const oglindaLunii = (a, b, prag) => {
  const na = numeLuna(a.cheie), nb = numeLuna(b.cheie), L = [], numeZile = "zilele cu peste " + cate(prag, "bot", "boți");
  const pz = (o) => (o.zilePeste.z ? o.zilePeste.z + " din " + o.zile + " (" + U2(o.zilePeste.net) + ")" : "niciuna din " + o.zile);
  const pb = (o, x) => (o[x.k].n ? cate(o[x.k].n, "bot", "boți") + (x.pc ? ", " + Math.round(100 * o[x.k].n / o.n) + "%" : "") + " (" + U2(o[x.k].net) + ")" : "niciunul");
  L.push(mare(na) + ": " + cate(a.n, "bot", "boți") + ", net " + U2(a.net) + " în " + cate(a.zile, "zi", "zile") + " cu boți · " + nb + ": " + cate(b.n, "bot", "boți") + ", net " + U2(b.net) + " în " + cate(b.zile, "zi", "zile") + ".");
  L.push("Zile cu peste " + cate(prag, "bot", "boți") + ": " + pz(a) + " · " + nb + ": " + pz(b) + ".");
  for (const x of OBICEIURI) if (x.k !== "lichidati" || a.lichidati.n || b.lichidati.n) L.push(x.rand + ": " + pb(a, x) + " · " + nb + ": " + pb(b, x) + ".");
  // ce s-a rărit / îndesit: după pondere (zilele pline din zile, boții din boți), ca o lună cu mai mulți boți să nu pară mai rea doar de-asta
  const pond = [{ nume: numeZile, a: a.zile ? a.zilePeste.z / a.zile : 0, b: b.zile ? b.zilePeste.z / b.zile : 0 }].concat(OBICEIURI.map((x) => ({ nume: x.nume, a: a.n ? a[x.k].n / a.n : 0, b: b.n ? b[x.k].n / b.n : 0 })));
  const rar = pond.filter((p) => p.a < p.b).map((p) => p.nume), des = pond.filter((p) => p.a > p.b).map((p) => p.nume);
  L.push("Față de " + nb + ": " + (rar.length || des.length ? [rar.length ? "mai rar - " + rar.join(", ") : "", des.length ? "mai des - " + des.join(", ") : ""].filter(Boolean).join("; ") : "la fel la toate obiceiurile") + ".");
  const cost = [{ nume: numeZile, net: a.zilePeste.net }].concat(OBICEIURI.map((x) => ({ nume: x.nume, net: a[x.k].net }))).filter((c) => c.net < 0).sort((p, q) => p.net - q.net)[0];
  L.push("👉 " + (cost ? "Aș lucra luna asta la un singur obicei: " + cost.nume + " (boții lor au dat " + U2(cost.net) + ")." : "Aș păstra ritmul: niciun obicei n-a dat pe minus luna asta."));
  return { nivel: "info", cheie: "oglinda", titlu: "Oglinda lunii: " + na + " față de " + nb, mesaj: L.join("\n") };
};

// ---------------- v100.284 / colector v101.156 (el, 31.10): profitul REAL, duminica, în canalul evaluărilor ----------------
// p = Profit.profitPe(boții Pionex), q = Profit.profitPe(trade-urile T212) sau null; stareT212 = "ok" / "lipsa" (istoricul n-a venit) /
// "nelegat" (fără cheile T212). Doar ce s-a închis; sumele cu o zecimală și punct la mii („−5.900,1 USDT”).
const fMii = new Intl.NumberFormat("ro-RO", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const B1 = (v) => { v = Number(v) || 0; const a = Math.abs(v); return (v >= 0 ? "+" : "−") + (a > 0 && a < 0.05 ? "<0,1" : fMii.format(a)); };
const ddmm = (zi) => String(zi).slice(8, 10) + "." + String(zi).slice(5, 7);
const dataRo = (t) => { try { return new Intl.DateTimeFormat("ro-RO", { timeZone: "Europe/Bucharest", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(t)); } catch { return ""; } };
// v100.285 (ideile 1-2): `ext` = { costP, costQ, topP, topQ } ⇒ „din care comisioane (și funding)” pe fiecare rând cu închideri și cei mai
// buni / slabi 3 ai săptămânii sub fiecare piață; fără `ext`, mesajul din v100.284
export const profitReal = (p, q, stareT212, ext) => {
  const P = p.perioade, sapt = "săptămâna " + ddmm(P.saptamana.luni) + "–" + ddmm(P.saptamana.azi), E = ext || {};
  const et = { saptamana: sapt, luna: numeLuna(P.luna.cheie), an: P.an.an, total: "total" };
  const rand = (o, k, sg, pl, mon, cost, ceCost) => "• " + et[k] + (k === "total" && o.total.de ? ", de la " + dataRo(o.total.de) : "") + ": "
    + (o[k].n ? cate(o[k].n, sg, pl) + ", net " + B1(o[k].net) + " " + mon + (cost && cost[k] ? ", din care " + ceCost + " " + B1(cost[k]) : "")
      + " (" + Math.round(100 * o[k].plus / o[k].n) + "% pe plus)" : "niciun " + sg + " închis");
  const unul = (x) => x.eticheta + (x.dir === "long" || x.dir === "short" ? " " + x.dir : "") + " " + B1(x.rezultat) + " (" + dataRo(x.inchis).slice(0, 5) + ")";
  const top = (t, mon) => !t || !(t.buni.length || t.slabi.length) ? [] : ["Cei mai buni ai săptămânii (" + mon + "): " + (t.buni.length ? t.buni.map(unul).join(" · ") : "niciunul pe plus") + ".",
    "Cei mai slabi ai săptămânii (" + mon + "): " + (t.slabi.length ? t.slabi.map(unul).join(" · ") : "niciunul pe minus") + "."];
  const K = ["saptamana", "luna", "an", "total"], L = ["Doar ce s-a închis: boții și pozițiile încă deschise nu intră, nici pe plus, nici pe minus.", "Boții Pionex, netul după comisioane și funding:"];
  for (const k of K) L.push(rand(p, k, "bot", "boți", "USDT", E.costP, "comisioane și funding"));
  L.push(...top(E.topP, "USDT"));
  L.push("Trading 212, trade-urile închise, după comisioane:");
  if (q) { for (const k of K) L.push(rand(q, k, "trade", "trade-uri", "lei", E.costQ, "comisioane")); L.push(...top(E.topQ, "lei")); }
  else L.push(stareT212 === "nelegat" ? "• Trading 212 nu e legat la Radar." : "• istoricul Trading 212 n-a venit acum; îl adaug duminica viitoare.");
  return { nivel: "info", cheie: "profit", titlu: "Profitul real: " + sapt, mesaj: L.join("\n") };
};
