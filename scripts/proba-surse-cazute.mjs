// Proba „surse căzute” (I-863, v100.336) · transversală, pentru TOATE versiunile de acum înainte.
// Auditul din 12.11 a găsit șase cazuri din aceeași familie: o sursă lipsă sau veche arătată ca „e bine”. Probele de până atunci mergeau pe drumul bun.
// Aici fiecare sursă din listă e pusă în trei stări - EROARE (cererea a picat), GOALĂ (a venit fără date), VECHE (peste pragul ei) - și se rulează
// funcțiile de verdict și de frână exact cum le compune pagina. O singură regulă:
//   fără sursă nu iese nivel verde, nu iese „nimic roșu / nu e trasă”, iar fraza „ce aș face” nu invită.
// Sursă nouă ⇒ se adaugă în SURSE (acasa.js) și un rând aici, odată cu codul ei.
// Boții închiși (pauza după pierderi la rând) și barele T212 la nivel de pagină sunt în proba-v100332-t212 (R1, Y1); aici, funcțiile pure.
//   node scripts/proba-surse-cazute.mjs
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
const lib = (f) => citeste("public", "lib", f);
const fnDin = (src, nume) => { const i = src.indexOf("function " + nume + "("); assert.ok(i >= 0, "lipsește " + nume); const j = src.indexOf("\nfunction ", i + 10); return src.slice(i, j < 0 ? undefined : j); };
let teste = 0, picate = 0;
async function test(nume, f) { teste++; await Promise.resolve().then(f).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e && e.stack || e).split("\n").slice(0, 3).join(" | ").slice(0, 600)}`); }); }
console.log("\nSURSE CĂZUTE · fără sursă nu e verde și nu invită · proba\n");

const MIN = 60000, ORA = 3600000, ZI = 86400000;
const ctx = vm.createContext({ console, Math, Date, JSON, Intl, isFinite, isNaN, Number, String, Array, Object, RegExp });
for (const f of ["grid-calcul.js", "acasa.js", "actiuni-semnale.js"]) vm.runInContext(lib(f) + "\n;globalThis.__x = 1;", ctx);
vm.runInContext("globalThis.Acasa = Acasa; globalThis.ActiuniSemnale = ActiuniSemnale;", ctx);
const A = ctx.Acasa, AS = ctx.ActiuniSemnale;
const ACUM = Date.parse("2026-11-13T12:00:00Z");
const VERDE = ["larga", "liniste"];
const invitaBursa = (f) => /^Aș cumpăra/.test(String(f || "")), invitaCrypto = (f) => /^Aș porni/.test(String(f || ""));

// bursa sănătoasă: QQQ în urcare 260 de ședințe până ieri, VIX 15, 80 din 100 peste media de 50 ⇒ verde (verificat întâi)
const qqqBun = (pana) => Array.from({ length: 260 }, (_, i) => ({ t: pana - (259 - i) * ZI, o: 300 + i, h: 301 + i, l: 299 + i, c: 300 + i * 1.2 }));
const ieri = ACUM - ZI;
function bursa(o) {
  const v = A.vremeBursa({ qqq: o.qqq, vix: o.vix, ndx: o.ndx, acum: false });
  return A.franaSurse(v, A.deUndeStiu(o.surse, ACUM), "bursa");
}
const bun = { qqq: qqqBun(ieri), vix: 15, ndx: { e50: 80, n: 100 }, surse: [{ k: "qqq", la: ieri }, { k: "vix", la: ieri }, { k: "ndx", la: ACUM - 4 * ORA }, { k: "calendar", la: ACUM - MIN }] };
const cuSursa = (k, s, extra) => Object.assign({}, bun, extra, { surse: bun.surse.map((x) => (x.k === k ? Object.assign({ k }, s) : x)) });
const STARI = { eroare: { la: null, eroare: "HTTP 502" }, goala: { la: null, eroare: "gol" }, veche: null };

await test("0 martorul: cu toate sursele la zi bursa iese verde și invită (altfel proba n-ar dovedi nimic)", () => {
  const v = bursa(bun);
  assert.equal(v.nivel, "larga", JSON.stringify(v));
  assert.ok(invitaBursa(v.faCe), v.faCe);
});

const cazBursa = {
  qqq: { eroare: { qqq: null }, goala: { qqq: [] }, veche: { qqq: qqqBun(ACUM - 8 * ZI), la: ACUM - 8 * ZI } },
  vix: { eroare: { vix: null }, goala: { vix: null }, veche: { la: ACUM - 6 * ZI } },
  ndx: { eroare: { ndx: null }, goala: { ndx: null }, veche: { ndx: null, la: ACUM - 2 * ZI } }   /* pagina lasă lățimea veche afară din verdict (Acasa.ndxVechi) */
};
for (const k of Object.keys(cazBursa)) for (const stare of Object.keys(STARI)) {
  await test(`bursa · ${k} ${stare}: nu e verde, nu invită`, () => {
    const c = cazBursa[k][stare], s = STARI[stare] || { la: c.la };
    const v = bursa(cuSursa(k, s, c));
    assert.ok(!VERDE.includes(v.nivel), "nivel verde: " + v.nivel + " · " + v.eticheta);
    assert.ok(!invitaBursa(v.faCe), "invită: " + v.faCe);
  });
}

// crypto: clasamentul (sursa critică a vremii). Liniștea cu clasamentul la zi e martorul.
const clBun = { evita: 10, candidati: 90, dir: { long: 40, short: 30, neutru: 30 }, la: ACUM - 10 * MIN };
function crypto(cl, surse) { return A.franaSurse(A.vreme({ clasament: cl, btc: { miscare: false }, fg: 50, acum: ACUM }), A.deUndeStiu(surse, ACUM), "crypto"); }
await test("0 martorul crypto: clasamentul la zi ⇒ liniște, invită", () => {
  const v = crypto(clBun, [{ k: "clasament", la: clBun.la }]);
  assert.equal(v.nivel, "liniste"); assert.ok(invitaCrypto(v.faCe), v.faCe);
});
for (const [stare, cl, s] of [["eroare", null, { la: null, eroare: "HTTP 502" }], ["goala", { evita: 0, candidati: 0 }, { la: null, eroare: "gol" }], ["veche", Object.assign({}, clBun, { la: ACUM - 3 * ORA }), { la: ACUM - 3 * ORA }]]) {
  await test(`crypto · clasamentul ${stare}: nu e verde, nu invită`, () => {
    const v = crypto(cl, [Object.assign({ k: "clasament" }, s)]);
    assert.ok(!VERDE.includes(v.nivel), "nivel verde: " + v.nivel);
    assert.ok(!invitaCrypto(v.faCe), "invită: " + v.faCe);
  });
}

// frâna contului: raportul lipsă / vechi / fără risc ⇒ nu „nu e trasă” (ori frâna, ori „n-o pot judeca”)
for (const [stare, o] of [["lipsa", { raportStare: "lipsa" }], ["veche", { raportStare: "vechi", raportOre: 20 }], ["goala (fără risc)", { raportStare: "ok", raport: { valoare: { total: 25000 }, risc: {} } }], ["fără o sursă", { raportStare: "ok", raport: { valoare: { total: 25000 }, risc: { var95: 300 }, lipsuri: ["pozițiile Trading 212"] } }]]) {
  await test(`raportul contului ${stare}: frâna trasă sau „n-o pot judeca”, niciodată tăcere`, () => {
    const m = A.franaContMotive(o), n = A.riscNecunoscut(o);
    assert.ok(m.length || n, "nici frână, nici „n-o pot judeca”");
  });
}

// calendarul: cererea picată sau venit cu eroare ⇒ spune că n-a venit (nu „Nimic important”)
const EC = lib("acasa-ecran.js");
await test("calendarul eroare / goală cu eroare: spune că n-a venit", () => {
  const nota = new Function(fnDin(EC, "acCalendarNota") + "\nreturn acCalendarNota;")();
  assert.match(nota({ calendarErr: "HTTP 500" }, null), /n-a venit/);
  assert.match(nota({ calendar: { eroare: "faireconomy" } }, { text: "Nimic important de aici până la sfârșitul săptămânii." }), /n-a venit/);
  const r = A.deUndeStiu([{ k: "calendar", la: ACUM - 2 * ZI }], ACUM);
  assert.equal(r.bucati[0].vechi, true, "calendarul vechi se vede vechi");
});

// barele T212: lipsă / vechi / ale altui simbol ⇒ semaforul nu judecă (nu „ȚINE”)
await test("barele T212 lipsă / vechi / nepotrivite: nu se judecă", () => {
  const b = (pana, c) => Array.from({ length: 30 }, (_, i) => ({ t: pana - (29 - i) * ZI, o: c, h: c * 1.01, l: c * 0.99, c }));
  assert.equal(AS.verificaBare([], 50, "AAPL_US_EQ", ACUM).judec, false);
  assert.equal(AS.verificaBare(b(ACUM - 12 * ZI, 50), 50, "AAPL_US_EQ", ACUM).judec, false);
  assert.equal(AS.verificaBare(b(ieri, 500), 50, "AAPL_US_EQ", ACUM).judec, false);
  const st = AS.stare([], 50), s = AS.semafor({ simbol: "AAPL", pret: 50, pretMediu: 40, qty: 1 }, st);
  assert.notEqual(s.nivel, "tine", "fără bare semaforul a zis ȚINE");
});

// cursul BNR lipsă ⇒ nu se dau bucăți (mărimea nu se socotește pe un curs inventat)
await test("cursul lipsă: nicio mărime de poziție", () => {
  assert.equal(AS.marime({ cont: 25000, intrare: 100, stop: 90, fx: null }), null);
  assert.equal(AS.marime({ cont: 25000, intrare: 100, stop: 90, fx: 0 }), null);
  const r = A.deUndeStiu([{ k: "curs", la: ACUM - 7 * ZI }], ACUM);   /* pragul cursului: 150 h (vineri + luni libere) */
  assert.equal(r.bucati[0].vechi, true);
});

// lista surselor din acasa.js are pragul fiecăreia și cele critice ale verdictelor
await test("tabelul surselor: fiecare are prag; cele critice ale verdictelor sunt marcate", () => {
  const S = A.SURSE;
  for (const k of Object.keys(S)) assert.ok(S[k].prag > 0 && S[k].et, "sursa " + k + " fără prag / nume");
  for (const k of ["clasament", "qqq", "vix", "ndx", "pionex", "t212"]) assert.equal(S[k].critic, true, k + " nu e critică");
});

console.log(`\n${teste - picate} / ${teste} ok${picate ? ` · ${picate} PICATE` : ""}\n`);
if (picate) process.exit(1);
