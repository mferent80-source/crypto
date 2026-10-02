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

// ---- sarcina 2: Alerte.reguli - titlul ≤ 60, mesajul pe 2 randuri (faptul + „👉 ” actiunea), o singura voce ----
import("node:vm").then(() => {});
const vm = await import("node:vm");
for (const f of ["grid-calcul.js", "tablou-extra.js", "alerte.js", "scenariu.js", "directie.js", "sfaturi.js", "semnale-bot.js", "consiliu.js"]) vm.runInThisContext(citeste("public", "lib", f), { filename: f });
const { Alerte: A, TabloExtra: TE, Sfaturi: SF } = globalThis;
await test("Alerte.reguli: fiecare text (toate ramurile din gardă) trece regulile - titlul ≤ 60, faptul + „👉 ” acțiunea la persoana I, fără „opritor”, fără majuscule de strigat", async () => {
  const G = await modul("scripts", "garda-texte.mjs"), rele = [];
  for (const x of G.situatii().filter((y) => y.mod === "alerte" && /^alerta\./.test(y.sursa))) { const ab = G.verifica(x.text, x.tip, x.frate); if (ab.length) rele.push(x.sursa + " (" + x.sit + "): " + ab.join("; ") + " ⏎ " + x.text.replace(/\n/g, " ⏎ ")); }
  assert.equal(rele.length, 0, rele.length + " abateri, de ex.:\n" + rele.slice(0, 6).join("\n"));
});
const T0 = Date.UTC(2026, 9, 2, 6, 0), ORA = 3600000;
const CRV = (o) => Object.assign({ baza: "CRV.PERP", directie: "long", levier: 5, investit: 49.67, profitTotal: -3.2, pretCurent: 0.3858, gridJos: 0.3841, gridSus: 0.4331, distantaLichidarePct: 30,
  pretLichidare: 0.3382876201448984, gridProfitBrut: 3.2, pornitLa: T0 - 4 * 86400000 }, o || {});
// „Ce ai de făcut acum” cu alerta GENERATA de Alerte.reguli (nu scrisa de mana), avertismentul serverului si sfatul de acum
const randuri = (bot, ctx, avert) => {
  const r = A.reguli(bot, ctx || null, {}), al = Object.keys(r).filter((k) => r[k] && r[k].titlu && r[k].nivel !== "ok" && r[k].nivel !== "info").map((k) => ({ t: T0 - 5 * 60000, nivel: r[k].nivel, titlu: r[k].titlu, mesaj: r[k].mesaj }));
  const sf = SF.sfaturi(Object.assign(SF.intrare({ bot, k4: null, fisa: ctx && ctx.regim ? { dir: bot.directie, regim: ctx.regim, liniste: { linisteAcum: false } } : null, acum: T0 }), {}));
  return TE.ceAiDeFacut({ acum: T0, dateLa: T0, sfaturi: sf, avertismente: avert || [], alerte: al, planGol: false });
};
await test("unirea rândurilor cu alertele NOI: lichidarea la 6,2% și la 12,4% (alerta + avertismentul + sfatul) = un rând, cu acțiunea", async () => {
  const { avertismenteBot } = await modul("functions", "_shared", "avertismente.js");
  for (const d of [6.2, 12.4]) {
    const b = CRV({ distantaLichidarePct: d });
    const av = avertismenteBot({ x: { lossStop: "0.36" }, pret: b.pretCurent, jos: b.gridJos, sus: b.gridSus, lich: { pretLichidare: b.pretLichidare, lichidarePartea: "jos", distantaLichidarePct: d, lichidareDepasita: false }, comisioane: null, gridProfitBrut: null, profitNet: null });
    const l = randuri(b, null, av).filter((x) => /lichidare/i.test(x.titlu));
    assert.equal(l.length, 1, d + ": " + l.map((x) => x.titlu).join(" | "));
    assert.ok(/👉/.test(l[0].text), d + ": " + l[0].text);
  }
});
await test("unirea rândurilor cu alertele NOI: prețul ieșit din grid și mișcarea mare (contra și la botul neutru) = câte un rând", async () => {
  const { avertismenteBot } = await modul("functions", "_shared", "avertismente.js");
  const b = CRV({ pretCurent: 0.3801 }), av = avertismenteBot({ x: { lossStop: "0.36" }, pret: 0.3801, jos: b.gridJos, sus: b.gridSus, lich: { pretLichidare: b.pretLichidare, lichidarePartea: "jos", distantaLichidarePct: 30, lichidareDepasita: false }, comisioane: null, gridProfitBrut: null, profitNet: null });
  assert.equal(randuri(b, null, av).filter((x) => /grid/i.test(x.titlu)).length, 1, randuri(b, null, av).map((x) => x.titlu).join(" | "));
  for (const bot of [CRV(), CRV({ directie: "no_trend" })]) {
    const l = randuri(bot, { regim: { r4h: 2.4, r24h: 1.2, sens: "coboara", miscare: true } }).filter((x) => /mișcare/i.test(x.titlu));
    assert.equal(l.length, 1, bot.directie + ": " + l.map((x) => x.titlu).join(" | "));
  }
});
await test("sfatul „pericol” ia din alertă doar faptul (rândul 1), fără „👉”; acțiunea rămâne a semaforului, iar unde semaforul n-are, vine din alertă", () => {
  for (const b of [CRV({ distantaLichidarePct: 6.2 }), CRV({ pretCurent: 0.3801 }), CRV({ stareMargine: "MARGIN_CALL", stareRisc: "TRADING" }), CRV({ activ: false, stareInterna: "paused" })]) {
    const p = SF.sfaturi(SF.intrare({ bot: b, k4: null, fisa: null, acum: T0 })).filter((s) => s.cod === "pericol");
    assert.ok(p.length, JSON.stringify(b));
    for (const s of p) { assert.ok(!/👉|\n/.test(s.text), s.text); assert.ok(s.faCe && /^(Aș|N-aș|L-aș)\s/.test(s.faCe), s.tip + ": " + s.faCe); }
  }
});

console.log(`\nV100.66 ${picate ? "PICA" : "PASS"} · ${teste - picate}/${teste}`);
process.exitCode = picate ? 1 : 0;
