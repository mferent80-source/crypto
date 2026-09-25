// Rezumatul de dimineata (v89): o data pe zi, dupa 9:00 ora Romaniei, in Radar si pe Discord.
// deps: { date() -> {piata, deIesit, rezultate, plafon, boti, stiri}, Consilier, trimite(mesaj) -> true daca a ajuns,
//         stare: {dimineataTrimis}, jurnal, acum }
function ziRo(t) {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" }).formatToParts(new Date(t));
  const g = (k) => (p.find((x) => x.type === k) || {}).value;
  return { data: g("year") + "-" + g("month") + "-" + g("day"), ora: Number(g("hour")) };
}
export async function turaDimineata(d) {
  const acum = d.acum || Date.now(), z = ziRo(acum);
  if (z.ora < 9 || d.stare.dimineataTrimis === z.data) return { trimis: false };
  const date = (await d.date()) || {};
  const r = d.Consilier.rezumatDimineata(Object.assign({ acum }, date));
  if (await d.trimite({ nivel: "info", titlu: r.titlu + " (" + z.data.slice(8, 10) + "." + z.data.slice(5, 7) + ")", mesaj: r.linii.join("\n") })) { d.stare.dimineataTrimis = z.data; return { trimis: true, linii: r.linii }; }
  return { trimis: false };
}
