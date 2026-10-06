// Rezumatul de dimineata (v89): o data pe zi, dupa 9:00 ora Romaniei, in Radar si pe Discord.
// deps: { date() -> {piata, deIesit, rezultate, plafon, boti, stiri}, Consilier, trimite(mesaj) -> true daca a ajuns,
//         stare: {dimineataTrimis}, jurnal, acum }
function ziRo(t) {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" }).formatToParts(new Date(t));
  const g = (k) => (p.find((x) => x.type === k) || {}).value;
  return { data: g("year") + "-" + g("month") + "-" + g("day"), ora: Number(g("hour")) };
}
// v101.75 (I-552, el: „fă tot”): becurile 4h / 1z pe fiecare bot și poziție (⚠ = unul e împotriva direcției, „?” = fără date) + ce s-a schimbat
// față de rezumatul trimis data trecută. lista: [{ cheie, nume, dir: "long"|"short", h4, z1, faraZ1 }] (urca / coboara / lateral / null;
// faraZ1 = 1z nu se socotește prin regulă, ex. listările din afara SUA); ieri: { cheie: { h4, z1 } } | null; eticheta: „Peste noapte” / „Față de 04.10”
// ⇒ { linii (fiecare ≤ 160, rupte între elemente), azi: { cheie: { h4, z1 } } - o valoare lipsă azi o păstrează pe cea știută }
const SAG = { urca: "↑", coboara: "↓", lateral: "↔" };
function rupe(cap, el, sep) {
  const linii = []; let r = cap;
  el.forEach((e) => { const add = (r === cap ? "" : sep) + e; if (r !== cap && (r + add).length > 160) { linii.push(r); r = cap + e; } else r += add; });
  linii.push(r); return linii;
}
export function liniiBecuri(lista, ieri, eticheta) {
  const l = Array.isArray(lista) ? lista.filter((x) => x && x.cheie && x.nume) : [], azi = {}, s = (d) => SAG[d] || "?", v0 = ieri && typeof ieri === "object" ? ieri : null;
  if (!l.length) return { linii: [], azi };
  // revizia (R5): doi boți pe aceeași monedă (NIL long și NIL short) se deosebesc prin direcție
  const dupa = {}; l.forEach((x) => { dupa[x.nume] = (dupa[x.nume] || 0) + 1; });
  const nume = (x) => x.nume + (dupa[x.nume] > 1 && x.dir ? " " + x.dir : "");
  const el = l.map((x) => {
    const v = v0 && v0[x.cheie]; azi[x.cheie] = { h4: x.h4 || (v && v.h4) || null, z1: x.z1 || (v && v.z1) || null };
    const contra = x.dir === "long" ? "coboara" : x.dir === "short" ? "urca" : null;
    return nume(x) + " " + s(x.h4) + "4h" + (x.faraZ1 ? "" : " " + s(x.z1) + "1z") + (contra && (x.h4 === contra || x.z1 === contra) ? " ⚠" : "");
  });
  const linii = rupe("🚦 Becurile 4h · 1z: ", el, " · ");
  if (v0) {
    const sch = [], et = eticheta || "Peste noapte"; let comparate = 0;
    l.forEach((x) => { const v = v0[x.cheie]; if (!v) return; comparate++; [["h4", "4h"], ["z1", "1z"]].forEach(([k, e]) => { if (v[k] && x[k] && v[k] !== x[k]) sch.push(nume(x) + " " + e + " " + s(v[k]) + "→" + s(x[k])); }); });
    if (sch.length) linii.push(...rupe("🔁 " + et + ": ", sch, ", "));
    else if (comparate) linii.push("🔁 " + et + ": niciun bec schimbat" + (comparate < l.length ? " (" + comparate + " din " + l.length + " comparate)" : ""));
  }
  return { linii, azi };
}
// revizia (R4): „Peste noapte” doar când rezumatul de comparat e de ieri; altfel „Față de 04.10”
export function etichetaIeri(data, acum) {
  if (!data) return "Peste noapte";
  return data === ziRo(acum - 864e5).data ? "Peste noapte" : "Față de " + String(data).slice(8, 10) + "." + String(data).slice(5, 7);
}
export async function turaDimineata(d) {
  const acum = d.acum || Date.now(), z = ziRo(acum);
  if (z.ora < 9 || d.stare.dimineataTrimis === z.data) return { trimis: false };
  const date = (await d.date()) || {};
  const r = d.Consilier.rezumatDimineata(Object.assign({ acum }, date));
  // v101.60 (I-513): rândurile colectorului, după cele ale Consilierului (Busola pe boții deschiși)
  // v101.62 (I-526): rândul-verdict al colectorului ÎNAINTEA rândurilor Consilierului
  const str = (l) => (Array.isArray(l) ? l.filter((x) => typeof x === "string" && x) : []);
  // v101.75 (I-552, revizia R3): becurile imediat după rândul-verdict - mesajul se taie la coadă (600 de caractere în Radar, 2000 pe Discord)
  const linii = str(date.liniiIntai).concat(str(date.liniiBecuri), r.linii, str(date.liniiExtra));
  if (await d.trimite({ nivel: "info", titlu: r.titlu + " (" + z.data.slice(8, 10) + "." + z.data.slice(5, 7) + ")", mesaj: linii.join("\n") })) {
    d.stare.dimineataTrimis = z.data;
    // „ieri” = ce a plecat, cu data lui; azi gol (Pionex / T212 picate) nu șterge ce era (revizia R4)
    if (date.becuriAzi && Object.keys(date.becuriAzi).length) d.stare.becuriIeri = { data: z.data, b: date.becuriAzi };
    return { trimis: true, linii };
  }
  return { trimis: false };
}
