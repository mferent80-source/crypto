// Proba alinierii (19.10.2026, el, cu poza pe ecranul lat: „în jurnal butonul de crypto și acțiuni nu sunt aliniate”).
// Pagina Jurnal își centrează copiii (`#jurnaltrade>*{max-width:var(--latime-pagina);margin-left:auto;margin-right:auto}`),
// dar `#jurnaltrade .jtFiltru{…margin:0 0 12px}` e mai tare (id + clasă) și le punea marginile laterale pe 0 ⇒ peste 1800 px
// butoanele stăteau lipite de meniu, titlul și cartelele la mijloc. Garda e pe CLASĂ: orice pagină care își centrează
// copiii așa, orice copil direct al ei cu o regulă `#pagina .clasa{margin…}` ⇒ marginile laterale trebuie să rămână `auto`.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const citeste = (...p) => fs.readFileSync(path.join(RAD, ...p), "utf8").replace(/\r\n/g, "\n");
let teste = 0, picate = 0;
function test(nume, f) { teste++; try { f(); console.log(`  ok   ${nume}`); } catch (e) { picate++; console.log(`  PICA ${nume}\n       ${e && e.message}`); } }
console.log("\nJurnal · butoanele Crypto / Acțiuni / Tot aliniate cu restul paginii · proba\n");

const css = citeste("public", "app.css"), html = citeste("public", "index.html");
// regulile simple (fără @media imbricat): selector{corp}
const reguli = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ sel: m[1].trim(), corp: m[2] }));
// paginile care își centrează copiii direcți: #id>*{…margin-left:auto…margin-right:auto…} sau margin-inline:auto
const centrate = reguli.filter((r) => /^#[\w-]+>\*$/.test(r.sel) && (/margin-left:auto/.test(r.corp) && /margin-right:auto/.test(r.corp) || /margin-inline:auto/.test(r.corp))).map((r) => r.sel.slice(1, -2));

// clasele copiilor DIRECȚI ai paginii, din index.html (adâncimea numărată pe <div>/<section>/<details>…)
function claseCopii(id) {
  const start = html.indexOf(`id="${id}"`); if (start < 0) return [];
  const deschis = html.lastIndexOf("<", start), rest = html.slice(deschis);
  const VOID = /^(br|img|input|meta|link|hr|source|wbr)$/i, cl = new Set();
  let adanc = 0;
  for (const m of rest.matchAll(/<(\/?)([a-zA-Z][\w-]*)([^>]*)>/g)) {
    const [, inchide, tag, atr] = m;
    if (VOID.test(tag) || /\/$/.test(atr)) { continue; }
    if (inchide) { adanc--; if (adanc === 0) break; continue; }
    if (adanc === 1) { const c = atr.match(/class="([^"]*)"/); if (c) c[1].split(/\s+/).filter(Boolean).forEach((x) => cl.add(x)); }
    adanc++;
  }
  return [...cl];
}
// marginile laterale dintr-un corp de regulă: null = nu le atinge
function laterale(corp) {
  const out = [];
  const sh = corp.match(/(?:^|;)\s*margin\s*:\s*([^;]+)/);
  if (sh) { const v = sh[1].replace(/!important/, "").trim().split(/\s+/); const st = v.length === 1 ? v[0] : v.length <= 3 ? v[1] : v[3], dr = v.length === 1 ? v[0] : v[1]; out.push(st, dr); }
  for (const k of ["margin-left", "margin-right", "margin-inline"]) { const m = corp.match(new RegExp(`(?:^|;)\\s*${k}\\s*:\\s*([^;]+)`)); if (m) out.push(m[1].trim().split(/\s+/)[0]); }
  return out.length ? out : null;
}

test("Jurnalul își centrează copiii (regula pe care o protejează proba există)", () => {
  assert.ok(centrate.includes("jurnaltrade"), "lipsește #jurnaltrade>*{…margin-left:auto;margin-right:auto}");
});
test("🔑 #jurnaltrade .jtFiltru (butoanele Crypto / Acțiuni / Tot) își ține marginile laterale pe auto", () => {
  const r = reguli.find((x) => x.sel === "#jurnaltrade .jtFiltru");
  assert.ok(r, "regula #jurnaltrade .jtFiltru lipsește");
  const l = laterale(r.corp);
  assert.ok(!l || l.every((v) => v === "auto"), `marginile laterale: ${l && l.join(" / ")}`);
});
test("pe clasă: niciun copil direct al unei pagini centrate nu-și pune marginile laterale în afară de auto", () => {
  const rele = [];
  for (const id of centrate) for (const c of claseCopii(id)) for (const r of reguli) {
    if (!r.sel.split(",").map((s) => s.trim()).includes(`#${id} .${c}`)) continue;
    const l = laterale(r.corp);
    if (l && !l.every((v) => v === "auto")) rele.push(`#${id} .${c} → ${l.join(" / ")}`);
  }
  assert.deepEqual(rele, []);
});

console.log(`\n${teste - picate}/${teste} ${picate ? "PICĂ" : "trec"}`);
process.exit(picate ? 1 : 0);
