// Sugestiile de monede (v101.58, 03.10, el: reveniri + short direcționat): o dată pe zi, de la 8:00 ora României - istoricul celor două
// liste (piața din depozitul de bare de 1 h, agregat 4h ca la clasament, + boții LUI) și urmărirea lor (notările zilei din clasament,
// prețurile de acum din tickerele Pionex PERP). Un filtru, nu o predicție: istoricul se arată lângă liste, „mai slab” la vedere.
// deps: { acum, zi, ora, stare:{zi}, Reveniri, Idei, G (GridCalcul), simboluriDepozit() -> [simbol], bare1h(simbol) -> [{t,o,h,l,c}],
//         boti() -> [{simbol, dir, pornit, net}], cere(cale), trimite(cale, corp), jurnal(...), scrieStare(st) }
const H4 = 4 * 3600000;
export async function turaSugestii(d) {
  if (d.ora < 8 || d.stare.zi === d.zi) return null;
  d.stare.zi = d.zi; d.scrieStare(d.stare);   // o dată pe zi, chiar dacă pică la mijloc (mâine din nou)
  const R = d.Reveniri, G = d.G, cache = new Map();
  const bare4 = (s) => { if (!cache.has(s)) cache.set(s, G.agrega(d.bare1h(s) || [], H4).filter((x) => x && Number.isFinite(x.c))); return cache.get(s); };
  // 1) istoricul pieței: punctele de pe fiecare monedă din depozit (fereastra clasamentului: 500 de bare de 4h)
  const serii = [];
  for (const s of d.simboluriDepozit()) { const b = bare4(s); if (b.length < 520) continue; serii.push(R.puncte(b, { r: R.REGULI.moneda, dupaTimp: true, start: 499, G, short: true })); }
  const piataRev = R.dovada(serii, "revine", { pauzaZile: 7 }), piataShort = R.dovada(serii, "short", { pauzaZile: 7, short: true });
  // 2) boții lui, după starea monedei la pornire
  const botiD = R.dovadaBoti(await d.boti(), bare4, G);
  // 3) listele de azi (aceleași ca pe Tablou) + urmărirea celor vechi
  const cl = ((await d.cere("/api/istoric-bot?action=clasament")) || {}).clasament || null;
  const rev = d.Idei.reveniriBoti(cl, [], 5), sh = d.Idei.shortBoti(cl, [], 5), preturi = {};
  const tk = await d.cere("/api/market?type=pionex_tickers&market=PERP");
  for (const x of (tk && tk.data && tk.data.tickers) || []) { const p = Number(x && x.close); if (x && x.symbol && p > 0) preturi[String(x.symbol)] = p; }
  const ist = ((await d.cere("/api/istoric-bot?action=sugestii")) || {}).istoric || [];
  const urm = { revenire: R.urmarire(ist.filter((x) => x && x.lista === "revenire"), preturi, d.acum, { zile: 7, cost: 0.001 }),
    short: R.urmarire(ist.filter((x) => x && x.lista === "short"), preturi, d.acum, { zile: 7, cost: 0.001, short: true }) };
  const noi = rev.map((x) => ({ simbol: x.simbol, pret: preturi[x.simbol] || x.pret || null, lista: "revenire" })).concat(sh.map((x) => ({ simbol: x.simbol, pret: preturi[x.simbol] || x.pret || null, lista: "short" }))).filter((x) => x.pret > 0);
  await d.trimite("/api/istoric-bot?action=sugestii", { la: d.acum, zi: d.zi, dovada: { revenire: { piata: piataRev, boti: botiD.revenire }, short: { piata: piataShort, boti: botiD.short } }, urmarire: urm, noi });
  d.jurnal("sugestii: " + rev.length + " pe revenire, " + sh.length + " pentru short; istoricul: revenire " + ((piataRev && piataRev.eticheta) || "—") + ", short " + ((piataShort && piataShort.eticheta) || "—"));
  return { piataRev, piataShort, botiD, urm, noi };
}
