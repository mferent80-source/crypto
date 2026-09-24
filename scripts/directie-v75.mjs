// Probele modulului public/lib/directie.js - directia pietei fata de bot.
import assert from "node:assert/strict";
import fs from "node:fs";

const SRC = fs.readFileSync(new URL("../public/lib/directie.js", import.meta.url), "utf8");
const D = new Function(`${SRC}; return Directie;`)();

let teste = 0, picate = 0;
async function test(nume, fn) {
  teste++;
  await Promise.resolve().then(fn)
    .then(() => console.log(`  ok   ${nume}`))
    .catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${e.message}`); });
}

const ORA = 3600000;
// Randuri in forma Pionex {time, close}, cu o bara IN FORMARE la capat.
function randuri(preturi, t0 = 1_700_000_000_000) {
  return preturi.map((c, i) => ({ time: t0 + i * ORA, close: String(c) }));
}
const sus = (n, p0 = 1, pas = 0.004) => Array.from({ length: n }, (_, i) => p0 * (1 + pas * i + 0.001 * Math.sin(i)));
const jos = (n, p0 = 1, pas = 0.004) => Array.from({ length: n }, (_, i) => p0 * (1 - pas * i + 0.001 * Math.sin(i)));
const lateral = (n, p0 = 1) => Array.from({ length: n }, (_, i) => p0 * (1 + 0.02 * Math.sin(i * 0.9)));
// Mers aleator cu samanta fixa, ca proba sa fie repetabila.
function aleator(n, samanta = 7) {
  let s = samanta, p = 1; const out = [];
  for (let i = 0; i < n; i++) { s = (s * 16807) % 2147483647; p *= 1 + ((s / 2147483647) - 0.5) * 0.02; out.push(p); }
  return out;
}

console.log("\nV75 · directia pietei fata de bot · proba\n");

await test("inchideri: sorteaza dupa timp, scoate bara in formare, sare peste preturi lipsa (nu le face 0)", () => {
  const r = [{ time: 3, close: "3" }, { time: 1, close: "1" }, { time: 2, close: null }, { time: 4, close: "4" }, { time: 5, close: "0" }];
  // 5 are pret 0 -> sarit; 4 e ultima valida = in formare -> scoasa
  assert.deepEqual(D.inchideri(r), [1, 3]);
});

await test("inchideri: accepta si forma de lista [t,o,h,l,c]", () => {
  assert.deepEqual(D.inchideri([[1, 0, 0, 0, "10"], [2, 0, 0, 0, "11"], [3, 0, 0, 0, "12"]]), [10, 11]);
});

await test("trend clar in sus -> urca; in jos -> coboara; oscilatie -> lateral", () => {
  assert.equal(D.analizeaza(randuri(sus(150)), 24, "long").dir, "urca");
  assert.equal(D.analizeaza(randuri(jos(150)), 24, "long").dir, "coboara");
  assert.equal(D.analizeaza(randuri(lateral(150)), 24, "long").dir, "lateral");
});

await test("sub 60 de bare inchise -> nu-se-poate, fara directie inventata", () => {
  const a = D.analizeaza(randuri(sus(40)), 24, "long");
  assert.equal(a.dir, null);
  assert.equal(a.stare, "nu-se-poate");
});

await test("fata de bot: long + coboara = impotriva; long + urca = cu botul; lateral = bun pentru grid", () => {
  assert.equal(D.fataDeBot("coboara", "long").ton, "rau");
  assert.equal(D.fataDeBot("urca", "long").ton, "bine");
  assert.equal(D.fataDeBot("urca", "short").ton, "rau");
  assert.equal(D.fataDeBot("lateral", "long").eticheta, "bun pentru grid");
  assert.equal(D.fataDeBot("urca", "neutral").ton, "atentie");
});

await test("fara lookahead: starea unei bare NU se schimba cand se adauga bare viitoare", () => {
  const p = aleator(300);
  const scurt = D.stari(p.slice(0, 200)), lung = D.stari(p);
  for (let i = 0; i < 200; i++) assert.deepEqual(scurt[i], lung[i], `bara ${i} s-a schimbat cand au venit bare noi`);
});

await test("schimbarea: cazurile nu se suprapun (cel mult bare/orizont) si au IC", () => {
  const st = D.stari(aleator(500));
  const s = D.schimbare(st, 24);
  assert.ok(s.cazuri <= Math.ceil(500 / 24), `${s.cazuri} cazuri din 500 de bare la orizont 24 - se suprapun`);
  if (s.valoare !== null) {
    assert.ok(s.ic && s.ic.jos <= s.valoare && s.valoare <= s.ic.sus, "intervalul de incredere trebuie sa cuprinda valoarea");
  }
});

await test("schimbarea: sub 10 cazuri -> nu-se-poate cu valoare null, nu 0%", () => {
  const s = D.schimbare(D.stari(sus(120)), 24);
  assert.equal(s.valoare, null);
  assert.equal(s.stare, "nu-se-poate");
});

await test("schimbarea: masoara corect pe o serie care se intoarce regulat", () => {
  // 4 cicluri lungi sus/jos -> dupa o stare 'urca', la 60 de bare distanta, adesea alta directie
  let p = [], x = 1;
  for (let ciclu = 0; ciclu < 12; ciclu++) for (let i = 0; i < 80; i++) { x *= ciclu % 2 ? 0.995 : 1.005; p.push(x * (1 + 0.0005 * Math.sin(i))); }
  const s = D.schimbare(D.stari(p), 60);
  assert.ok(s.cazuri >= 10, `prea putine cazuri: ${s.cazuri}`);
  assert.ok(s.valoare > 30, `pe o serie care se intoarce la 80 de bare, schimbarea la 60 trebuie sa fie frecventa: ${s.valoare}`);
});

await test("wilson: 0 cazuri -> null; 5 din 10 cuprinde 50%; limitele raman in 0..100", () => {
  assert.equal(D.wilson(0, 0), null);
  const w = D.wilson(5, 10); assert.ok(w.jos < 50 && w.sus > 50);
  const z = D.wilson(0, 12); assert.equal(z.jos, 0); assert.ok(z.sus > 0 && z.sus <= 100);
});

await test("rezumat: 4H si 1D amandoua impotriva unui bot long -> spune IMPOTRIVA, ton rau", () => {
  const r = [
    { tf: "4H", eticheta: "4h", ...D.analizeaza(randuri(jos(150)), 6, "long") },
    { tf: "1D", eticheta: "1 zi", ...D.analizeaza(randuri(jos(150)), 7, "long") },
  ];
  const z = D.rezumat(r, "long");
  assert.equal(z.ton, "rau");
  assert.match(z.text, /ÎMPOTRIVA/);
});

await test("rezumat: fara intervale mari -> spune ca nu stie, nu inventeaza", () => {
  assert.equal(D.rezumat([{ tf: "15M", dir: "urca", fata: { ton: "bine" } }], "long").ton, "nu-se-poate");
});

await test("bara in formare: miscarea fata de ultima inchidere se masoara separat, nu intra in directie", () => {
  const r = [{ time: 1, close: "1.00" }, { time: 3, close: "0.93" }, { time: 2, close: "1.00" }, { time: 4, close: null }];
  const f = D.inFormare(r);
  assert.ok(Math.abs(f.pct - -7) < 1e-9, `asteptat -7%, a dat ${f.pct}`);
  assert.equal(D.inFormare([{ time: 1, close: "1" }]), null, "cu o singura bara nu am fata de ce");
  assert.ok(D.analizeaza(randuri(sus(150)), 24, "long").formare, "analiza trebuie sa poarte si miscarea din bara de acum");
});

await test("rezumat: bara de 4h de acum care cade tare peste un 'urca' pe barele inchise se spune, iar tonul scade", () => {
  const p = sus(150); p[p.length - 1] = p[p.length - 2] * 0.93; // bara in formare: -7%
  const r = [{ tf: "4H", eticheta: "4 ore", ...D.analizeaza(randuri(p), 6, "long") }, { tf: "1D", eticheta: "1 zi", ...D.analizeaza(randuri(sus(150)), 7, "long") }];
  const z = D.rezumat(r, "long");
  assert.match(z.text, /scade cu 7/, z.text);
  assert.equal(z.ton, "atentie", "verde linistitor peste o scadere de 7% in bara de acum");
});

console.log(`\nV75_DIRECTIE ${picate ? "FAIL" : "PASS"} · ${teste - picate}/${teste}\n`);
process.exit(picate ? 1 : 0);
