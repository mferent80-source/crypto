// Proba v100.66 (02.10, el: „FA TOT”) - sfaturile concise, pachetul 3: alertele si Discord
// (public/lib/alerte.js, mesajele colectorului, avertizarea la pornire, alertele simbolurilor si SL/TP, fisa de inchidere).
// Planul: docs/superpowers/plans/2026-10-02-sfaturi-pachetul-3-alerte-discord.md
import "./lib/text-ro-global.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const RAD = process.env.RAD || path.resolve(new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8");
const modul = (...p) => import(pathToFileURL(path.join(RAD, ...p)).href);
let teste = 0, picate = 0;
async function test(nume, fn) { teste++; await Promise.resolve().then(fn).then(() => console.log(`  ok   ${nume}`)).catch((e) => { picate++; console.log(`  PICA ${nume}\n       ${String(e.message).slice(0, 500)}`); }); }
console.log("\nV100.66 · Sfaturile concise, pachetul 3: alertele și Discord · proba\n");

// ---- sarcina 1: garda pe toate alertele; mesajele colectorului intr-un modul pur ----
await test("mesajele colectorului stau în scripts/lib/mesaje-colector.mjs; colectorul le cheamă, nu le mai scrie pe loc", () => {
  const c = citeste("scripts", "colector.mjs");
  assert.match(c, /import \* as MesajeColector from "\.\/lib\/mesaje-colector\.mjs";/);
  for (const t of ["nu mai apare în lista Pionex", "gridul îngust a ajuns la", "Frâna contului", "din contul Trading 212", "Trading 212 nu mai răspunde de", "Crypto Radar nu mai poate citi botul",
    "botul n-are plan", "perechi încheiate", "Raportul de duminică (", "Autopsia acțiunilor (", "alertele sunt legate", "(întârziat ", "Crypto Radar s-a oprit", "citește din nou botul", "Trading 212 răspunde din nou"])
    assert.ok(!c.includes(t), "colectorul scrie încă pe loc: " + t);
});
await test("alertele din tura-scan, tura-piata și tura-pornire au funcții exportate (garda le generează)", async () => {
  const sc = await modul("scripts", "lib", "tura-scan.mjs"), pi = await modul("scripts", "lib", "tura-piata.mjs"), po = await modul("scripts", "lib", "tura-pornire.mjs");
  assert.equal(typeof sc.mesajReteta, "function"); assert.equal(typeof pi.mesajFundingPiata, "function"); assert.equal(typeof po.mesajPornire, "function");
});
await test("garda generează toate alertele (≥ 70 de texte în grupul „alerte”), din fiecare familie", async () => {
  const G = await modul("scripts", "garda-texte.mjs"), l = G.situatii().filter((x) => x.mod === "alerte");
  assert.ok(l.length >= 70, "doar " + l.length + " texte");
  const surse = new Set(l.map((x) => x.sursa.split(".").slice(0, 2).join(".")));
  for (const s of ["alerta.lich", "alerta.status", "alerta.activ", "alerta.grid", "alerta.directie", "alerta.miscare", "alerta.plan", "alerta.plan-stop", "alerta.grid-plan", "alerta.plan-tinta",
    "alerta.s-iesi", "alerta.s-ia-profit", "alerta.s-muta", "alerta.s-btc", "alerta.s-aglomerare", "alerta.m-btc", "alerta.m-funding", "alerta.p-zero", "alerta.p-margine", "alerta.opritor",
    "alerta.tacut", "grila.pereche", "grila.atinsa", "podeaUrca.mesaj", "preturi.rea", "preturi.dinNou", "raportBoti.mesaj", "miscareNeobisnuita.moneda", "miscareNeobisnuita.actiune",
    "schimbareVreme.crypto", "schimbareVreme.corelatie", "fisaInchidere.minus", "alerteSimboluri.miscare", "alerteSimboluri.insider", "alerteSLTP.aproape", "alerteSLTP.sl", "alerteSLTP.tp", "alerteSLTP.intrare",
    "pornire.mesaj", "reteta.intrat", "reteta.iesit", "fundingPiata.mesaj", "colector.serverOprit", "colector.citireRea", "colector.lipsaPionex", "colector.faraPlan", "colector.ceasIngust",
    "colector.t212Rau", "colector.pondereT212", "colector.perechiOra", "colector.frana", "colector.legat"])
    assert.ok(surse.has(s), "lipsește familia " + s + " (sunt: " + [...surse].slice(0, 12).join(", ") + " …)");
});

console.log(`\nV100.66 ${picate ? "PICA" : "PASS"} · ${teste - picate}/${teste}`);
process.exitCode = picate ? 1 : 0;
