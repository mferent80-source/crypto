// pachetul 1 (sfaturi concise): probele vechi aduse la textul nou - acelasi FAPT verificat, alta formulare (fiecare schimbare notata)
export const s3_cuBotul = [
  [`assert.match(r.motiv, /^mișcarea e cu botul .*lucrează pentru tine$/);
  assert.match(r.faCe, /fără bani în plus/); assert.match(r.faCe, /opritorul de pierdere la prețul de zero \\(28\\.5000\\)/); assert.match(r.faCe, /marginea de sus \\(33\\.0000\\) mai sunt 10,0%/);`,
   `assert.match(r.motiv, /^mișcarea e cu botul: \\d+,\\d× față de obișnuit$/);   // v100.61: titlul = faptul cu cifra
  assert.match(r.faCe, /fără bani în plus/); assert.match(r.faCe, /stopul la zero-ul botului \\(28\\.5\\)/); assert.match(r.deCe, /marginea de sus \\(33\\) mai sunt 10,0%/);   // v100.61: distanta in „de ce”`],
  [`assert.match(a.faCe, /Opritorul tău \\(29\\.0000\\) e deja dincolo de prețul de zero/);`,
   `assert.match(a.faCe, /stopul \\(29\\) e deja dincolo de zero/);`],
  [`assert.equal(s.cod, "cu-botul"); assert.match(s.faCe, /grilele de jos/); assert.match(s.faCe, /marginea de jos \\(27\\.0000\\) mai sunt 10,0%/);
  const pierdere = S.semafor({ bot: bot(), fisa: { regim: SUS }, zero: { pretZero: 31 } }); assert.doesNotMatch(pierdere.faCe, /prețul de zero/, "pe minus nu se propune opritor la zero");`,
   `assert.equal(s.cod, "cu-botul"); assert.match(s.deCe, /grilele de jos/); assert.match(s.deCe, /marginea de jos \\(27\\) mai sunt 10,0%/);
  const pierdere = S.semafor({ bot: bot(), fisa: { regim: SUS }, zero: { pretZero: 31 } }); assert.doesNotMatch(pierdere.faCe, /zero-ul botului/, "pe minus nu se propune stop la zero");`],
  [`assert.equal(r.nivel, "iesi"); assert.match(r.faCe, /muți ținta mai sus/);
  assert.equal(S.semafor({ bot: bot(), fisa: { regim: JOS }, plan: { atins: ["plus"], plus: { prag: 5 } } }).faCe, "Încasează acum, cum ți-ai propus.");`,
   `assert.equal(r.nivel, "iesi"); assert.match(r.faCe, /aș muta ținta mai sus/);
  assert.equal(S.semafor({ bot: bot(), fisa: { regim: JOS }, plan: { atins: ["plus"], plus: { prag: 5 } } }).faCe, "Aș închide botul pe plus acum, cum ți-ai propus.");`],
  [`assert.match(r.faCe, /opritorul de pierdere din Pionex la 30\\.55\\d\\d \\(0,7% de prețul de acum/); assert.match(r.faCe, /E aproape/);`,
   `assert.match(r.faCe, /stopul la 30\\.55\\d\\d \\(0,7% de preț\\)/); assert.match(r.deCe, /E aproape/);`],
  [`assert.match(r.motiv, /la adăpost: opritorul tău \\(30\\.5\\d+\\) îți păstrează \\+3,00 USDT/);`,
   `assert.match(r.motiv, /la adăpost/); assert.match(r.faCe, /stopul \\(30\\.5\\d*\\) păstrează \\+3,00 USDT/);`],
  [`assert.match(r.faCe, /Cu 1,5% loc de respirație, opritorul la 31\\.0275 îți păstrează \\+\\d+,\\d\\d USDT \\(cel de acum păstrează −/);`,
   `assert.match(r.deCe, /Cu 1,5% loc de respirație, stopul la 31\\.0275 ar păstra \\+\\d+,\\d\\d USDT \\(cel de acum: −/);`],
];
export const s3_semnale = [[`assert.ok(r); assert.match(r.text, /\\+3\\.00 USDT/);`, `assert.ok(r); assert.match(r.text, /\\+3,00 USDT/);   // v100.61: virgula zecimala (TextRo)`]];
export const s4_v1018 = [[`  assert.match(s.act, /planul tău zice −15,7/);`, `  assert.match(s.deCe, /Planul tău zice −15,7/);   // v100.61: planul in „de ce”, actiunea in act`]];
export const s4_v10043 = [
  [`assert.match(st.act || "", /mută-l la 0\\.3842/, st.act);`, `assert.match(st.act || "", /Aș muta stopul la 0\\.3842/, st.act);`],
  [`assert.match(st.bani, /−10,1 USDT cu opritorul de acum → −7,4 USDT/);`, `assert.match(st.bani, /−10,1 USDT cu stopul de acum → −7,4 USDT/);`],
];
export const s5_v10044 = [
  [`assert.match(c.titlu, /^Stopul te costă mai mult decât planul, iar prețul stă lângă marginea de jos$/, c.titlu);`,
   `assert.match(c.titlu, /^Stopul costă peste plan, iar prețul e lângă marginea de jos$/, c.titlu);   // v100.61: titlul ≤ 60`],
  [`assert.match(c.faCe, /în 71% din zile/); assert.match(c.faCe, /\\(0\\.3842\\)/); assert.doesNotMatch(c.faCe, /\\d\\.\\d{6,}/, "pret neformatat"); assert.match(c.faCe, /n-aș pune bani în plus/);`,
   `assert.match(c.explica, /în 71% din zile/); assert.match(c.explica, /\\(0\\.3842\\)/); assert.doesNotMatch(c.faCe + c.explica, /\\d\\.\\d{6,}/, "pret neformatat"); assert.match(c.faCe, /n-aș pune bani în plus/);   // v100.61: de ce, separat`],
];
export const s3_v10045 = [
  [`assert.ok(m && /marginea de jos/.test(m.motiv) && /profilul CRV/.test(m.motiv), m && m.motiv);`,
   `assert.ok(m && /marginea de jos/.test(m.motiv) && /profilul CRV/.test(m.sursa), m && m.motiv);   // v100.61: sursa pe randul ei`],
  [`assert.ok(m2 && /marginea de jos/.test(m2.motiv) && /prag fix/.test(m2.motiv), m2 && m2.motiv);`,
   `assert.ok(m2 && /marginea de jos/.test(m2.motiv) && /Prag fix/.test(m2.deCe), m2 && m2.motiv);`],
  [`assert.ok(!/3 din 4/.test(m.motiv), m.motiv); assert.match(m.motiv, new RegExp("în " + n + "% din jumătățile de zi"), m.motiv);`,
   `assert.ok(!/3 din 4/.test(m.motiv + m.deCe), m.deCe); assert.match(m.deCe, new RegExp("în " + n + "% din jumătățile de zi"), m.deCe);`],
];
export const s4_v10045 = [
  [`const st = c.find((x) => x.cod === "stop"); assert.match(st.act, /profilul CRV/, st.act);`,
   `const st = c.find((x) => x.cod === "stop"); assert.match(st.sursa, /profilul CRV/, st.sursa);   // v100.61: pe randul ei, nu in actiune`],
  [`assert.equal(st2.pretPropus, 0.52); assert.equal(st2.sursaStop, null); assert.ok(!/profilul/.test(st2.act), st2.act);`,
   `assert.equal(st2.pretPropus, 0.52); assert.equal(st2.sursaStop, null); assert.ok(!/profilul/.test(st2.act + (st2.sursa || "")), st2.act);`],
];
export const s5_v10050 = [[`assert.match(r.alerta.titlu, /CRV: Consilierul — 🟡 Atenție/);
  assert.match(r.alerta.mesaj, /Ce aș face eu: fa atentie/);`,
  `assert.match(r.alerta.titlu, /^CRV · Atenție: /); assert.ok(r.alerta.titlu.length <= 60, r.alerta.titlu);   // v100.61: titlul Discord ≤ 60
  assert.match(r.alerta.mesaj, /^👉 fa atentie/); assert.ok(r.alerta.mesaj.split("\\n").length <= 2, "cel mult 2 randuri");`]];
export const s3_v10060 = [
  [`assert.match(k.faCeSlab, /nimic de făcut acum/); assert.ok(!/N-aș mai lăsa poziția să crească/.test(k.faCe + k.faCeSlab));`,
   `assert.match(k.faCeSlab, /N-aș face nimic acum/); assert.ok(!/N-aș mări poziția/.test(k.faCe + k.faCeSlab));   // v100.61: persoana I`],
  [`assert.match(a.motiv, /s-a apropiat/); assert.match(a.motiv, /13[.,]6/); assert.match(a.faCe, /N-aș mai lăsa poziția să crească/);`,
   `assert.match(a.motiv, /se apropie/); assert.match(a.motiv, /13,6/); assert.match(a.faCe, /N-aș mări poziția/);   // v100.61: „se apropie”, fara „s-a apropiat”`],
  [`assert.match(f.motiv, /^lichidarea e la 12/); assert.ok(!/s-a apropiat/.test(f.motiv));`,
   `assert.match(f.motiv, /^lichidarea la 12,4%$/); assert.ok(!/s-a apropiat/.test(f.motiv));`],
  [`assert.match(singur.faCe, /nimic de făcut/i, "singur: tot spune ca n-ai nimic de facut");`,
   `assert.match(singur.faCe, /N-aș face nimic acum/, "singur: tot spune ca n-ai nimic de facut");`],
];
export const s4_v99 = [[`assert.match(sub.find((x) => x.cod === "grid").text, /SUB gridul de jos cu 0,2%/);`, `assert.match(sub.find((x) => x.cod === "grid").text, /sub gridul de jos cu 0,2%/);   /* v100.61: fara majuscule de strigat */`]];   // revizia Opus I3: cu „//” comentariul inghitea asertiunea care urma pe rand
export const s4_v100 = [[`assert.match(nepus.tag.t, /pune-l/); assert.match(nepus.act, /Pune-l la 0\\.6012/);`, `assert.match(nepus.tag.t, /de pus la zero/); assert.match(nepus.act, /Aș pune stopul la 0\\.6012/);   // v100.61: persoana I`]];
