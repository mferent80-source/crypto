// Probele vechi aduse la textul nou (acelasi fapt, alta formulare) - fiecare lista pe fisierul ei (FISIERE), cu un comentariu /* … */
// (niciodata // lipit dupa cod - garda comentariilor). Se aplica cu: node ed.mjs <fisier> teste-vechi.mjs <lista>
export const FISIERE = {
  s2_scenariu77: "scripts/scenariu-v77.mjs",
  s2_cuBotul963: "scripts/cu-botul-v963.mjs",
  s2_directie75: "scripts/directie-v75.mjs",
  s2_proba10040: "scripts/proba-v10040.mjs",
  s3_proba10044: "scripts/proba-v10044.mjs",
  s4_pachet87: "scripts/pachet-v87.mjs",
  s5_botOrders72: "scripts/bot-orders-v72.mjs",
};

// sarcina 2 · scenariu-v77: sfaturi.js scrie cifrele prin TextRo (proba il incarca); ce face gridul contra trendului sta in legenda
// Consilierului (o verifica proba v100.62); indemnul „nu adăuga” e la persoana I; „deCe”-ul sfaturilor se numeste „sursa”
export const s2_scenariu77 = [
  [`import assert from "node:assert/strict";
`, `import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
`],
  [`assert.match(contra.text, /cumpără la fiecare nivel/);`, `assert.equal(contra.text, "4h: EMA20 sub EMA50, EMA50 coboară."); /* v100.62: textul = masuratoarea; „cumpără la fiecare grilă” e in legenda Consilierului */`],
  [`assert.match(m.faCe, /nu adăuga/i, "indemnul sta in 'ce as face eu'");`, `assert.match(m.faCe, /^N-aș adăuga bani/, "indemnul sta in 'ce as face eu'"); /* v100.62: la persoana I */`],
  [`assert.match(z.text, /83\\.30 USDT/);`, `assert.match(z.text, /83,30 USDT/); /* v100.62: virgula zecimala */`],
  [`(s.deCe || "")`, `(s.sursa || "")`],
];
// sarcina 2 · cu-botul-v963: titlul miscarii are cifra (fara „CU” cu majuscule), stopul se muta la zero-ul botului (vocabularul unic)
export const s2_cuBotul963 = [
  [`const cu = Sfaturi.sfaturi({ bot: bot(), fisa: { regim: SUS } }).find((x) => /Mișcare mare/.test(x.titlu));
  assert.equal(cu.ton, "bine"); assert.match(cu.titlu, /CU botul/); assert.match(cu.faCe, /opritorul la prețul de zero/);
  const co = Sfaturi.sfaturi({ bot: bot(), fisa: { regim: JOS } }).find((x) => /Mișcare mare/.test(x.titlu));
  assert.equal(co.ton, "atentie"); assert.match(co.titlu, /împotriva botului/);`,
   `const cu = Sfaturi.sfaturi({ bot: bot(), fisa: { regim: SUS } }).find((x) => /^Mișcare /.test(x.titlu));   /* v100.62: titlul cu cifra */
  assert.equal(cu.ton, "bine"); assert.match(cu.titlu, /^Mișcare cu botul: /); assert.match(cu.faCe, /stopul mutat la zero-ul botului/);
  const co = Sfaturi.sfaturi({ bot: bot(), fisa: { regim: JOS } }).find((x) => /^Mișcare /.test(x.titlu));
  assert.equal(co.ton, "atentie"); assert.match(co.titlu, /^Mișcare contra botului: /);`],
];
// sarcina 2 · directie-v75: acelasi fapt, fara majuscule de strigat
export const s2_directie75 = [
  [`  assert.match(z.text, /ÎMPOTRIVA/);`, `  assert.match(z.text, /^Piața merge împotriva botului \\(/); /* v100.62: fara „ÎMPOTRIVA” cu majuscule */`],
];
// sarcina 2 · proba-v10040: zero-ul pe minus ramane TAKE-PROFIT (nu stop), spus la persoana I
export const s2_proba10040 = [
  [`assert.match(lib("sfaturi.js"), /pune în Pionex take-profit-ul botului la " \\+ pret\\(z\\.pretZero\\) \\+ " \\(nu stop:/);`,
   `assert.match(lib("sfaturi.js"), /Aș pune take-profit-ul botului la " \\+ pret\\(z\\.pretZero\\) \\+ " ca să ies fără pierdere \\(nu stop:/); /* v100.62: la persoana I */`],
];
// sarcina 3 · proba-v10044: Consilierul nu mai rescrie titlul sfatului „margine” (vine gata din sfaturi.js); fixtura reala din 30.09
// pastreaza forma veche a titlului - nu se rescriu datele inregistrate, se verifica faptul (titlul si textul sfatului ajung in Consilier)
export const s3_proba10044 = [
  [`  assert.match(c.motive[1].titlu, /până la marginea de jos/); assert.match(c.motive[1].cip.t, /„Mută gridul” 7 din 10/);`,
   `  assert.match(c.motive[1].titlu, /până la marginea de jos/i); assert.match(c.motive[1].cip.t, /„Mută gridul” 7 din 10/);   /* v100.62: titlul vine gata din sfaturi.js */`],
  [`    if (s.cod === "margine") { assert.ok(tot.includes("până la marginea de jos (0.3841)") && tot.includes(s.text), "lipseste marginea"); continue; }   // titlul rescris cu cifra intai`,
   `    if (s.cod === "margine") { assert.ok(tot.includes(s.titlu) && tot.includes(s.text), "lipseste marginea"); continue; }   /* v100.62: titlul sfatului trece neschimbat */`],
];
// sarcina 5 · bot-orders-v72: aceleasi conditii, textele noi ale avertismentelor (fara majuscule, virgula, „stop / țintă”)
export const s5_botOrders72 = [
  [`assert.match(b.avertismente.join(" | "), /lichidarea DEPĂȘITĂ/i,`, `assert.match(b.avertismente.join(" | "), /Lichidarea estimată \\([^)]*\\) e depășită/, /* v100.62: fara majuscule de strigat */`],
  [`assert.match(b.avertismente.join(" | "), /lichidare.*9\\.4/i,`, `assert.match(b.avertismente.join(" | "), /Lichidarea la 9,4%/, /* v100.62: virgula */`],
  [`assert.ok(!/comisioanele mănâncă mai mult/.test(a),`, `assert.ok(!/depășesc câștigul grilelor/.test(a), /* v100.62: textul nou al aceluiasi avertisment */`],
  [`assert.match(a, /grid \\+2\\.80.*comisioane −0\\.64.*restul −4\\.11 din poziție\\/finanțare/,`,
   `assert.match(a, /Grilele câștigă \\(\\+2,80 USDT\\), dar poziția și funding-ul \\(−4,11\\) și comisioanele \\(−0,64\\) duc botul pe minus/, /* v100.62: virgula, fara „NET” */`],
  [`assert.match(b.avertismente.join(" | "), /comisioanele mănâncă mai mult decât câștigă botul/);`, `assert.match(b.avertismente.join(" | "), /Comisioanele \\([−+]?[0-9,]+ USDT\\) depășesc câștigul grilelor/); /* v100.62 */`],
  [`assert.match(b.avertismente.join(" | "), /niciun opritor/i);`, `assert.match(b.avertismente.join(" | "), /n-are nici stop, nici țintă/); /* v100.62: vocabularul „stop / țintă” */`],
];
// sarcina 4 · pachet-v87: ritmul de recuperare scrie cifrele prin TextRo - proba il incarca (ca pagina si colectorul)
export const s4_pachet87 = [
  [`import assert from "node:assert/strict";
`, `import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
`],
];
