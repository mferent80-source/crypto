// v101.26 (pachetul 1, 01.10): PROFILUL MONEDEI. Noaptea (02:00-05:00 ora Romaniei), o data pe zi: pentru monedele botilor din
// ultimele 60 de zile + cei activi, barele de 1 ORA pe 6 luni (prima data ~9 pagini de 500, apoi doar pagina noua) pe disc,
// profilul (ProfilMoneda.calculeaza) in KV profil:<SIMBOL>. Moneda fara profil (bot nou) nu asteapta noaptea: se face la prima
// tura. Pauza 1,6 s intre cereri (serverul lasa 120 de citiri pe minut). Probat in scripts/proba-v10045.mjs.
export const ZILE = 183, PAS_MS = 1600, PAGINA = 500, ORA = 3600000;
const tBara = (r) => Number(Array.isArray(r) ? r[0] : r && r.time);
export function eNoapte(t) {
  const o = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Bucharest", hour: "2-digit", hourCycle: "h23" }).format(new Date(t)));
  return o >= 2 && o < 5;
}
const ziRo = (t) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest" }).format(new Date(t));
export async function aduOre(simbol, vechi, d) {
  const deLa = d.acum - ZILE * 24 * ORA;
  // ce e pe disc se pastreaza doar daca ajunge inapoi pana la 6 luni (altfel o umplere intrerupta ar ramane cu gaura)
  let randuri = Array.isArray(vechi) && vechi.length && tBara(vechi[0]) <= deLa + 24 * ORA ? vechi : [];
  const ultima = randuri.length ? tBara(randuri[randuri.length - 1]) : null;
  let end = null;
  for (let p = 0; p < 12; p++) {
    if (p) await d.pauza(PAS_MS);
    const k = await d.cere("/api/market?type=pionex_klines&symbol=" + encodeURIComponent(simbol) + "&interval=60M&limit=" + PAGINA + (end ? "&endTime=" + end : ""));
    const r = k && k.data && Array.isArray(k.data.klines) ? k.data.klines : null;
    if (!r) throw new Error((k && (k.error || k.message)) || "fara lumanari 60M");
    randuri = d.GridCalcul.imbinaRanduri(randuri, r, ZILE * 24 + 48);
    const t = r.map(tBara).filter(Number.isFinite);
    if (!t.length || r.length < PAGINA) break;
    const cea = Math.min(...t);
    if (cea <= deLa || (ultima !== null && cea <= ultima)) break;
    end = cea - 1;
  }
  return randuri;
}
// revizia 01.10: serverul are buget (120 de citiri pe minut, deja RATE_LIMITED pe 30.09) - lista monedelor tinuta o ora, arhiva
// botilor o data pe tura (nu pe moneda), pauza intre ORICE doua monede, moneda care pica se amana (20 min, 40, ... cel mult o zi)
export async function turaProfil(d) {
  const noapte = eNoapte(d.acum), azi = ziRo(d.acum), st = d.stare;
  st.facute = st.facute || {}; st.esuat = st.esuat || {};
  if (!st.lista || !(d.acum - st.lista.la < ORA)) st.lista = { la: d.acum, v: await d.simboluri() };
  let tr = null, facute = 0;
  const toateTrades = async () => tr || (tr = await d.trades());
  for (const { simbol, moneda } of st.lista.v) {
    const f = st.facute[simbol], e = st.esuat[simbol];
    if (f && !(noapte && f.zi !== azi)) { if (f.profil && !d.profile.has(simbol)) d.profile.set(simbol, f.profil); continue; }
    if (e && d.acum - e.la < Math.min(24 * ORA, 10 * 60000 * Math.pow(2, e.n))) continue;
    try {
      if (facute++) await d.pauza(PAS_MS);
      const randuri = await aduOre(simbol, d.citesteBare(simbol), d);
      d.scrieBare(simbol, randuri);
      const trades = (await toateTrades()).filter((t) => t.moneda === moneda);
      const profil = d.ProfilMoneda.calculeaza(d.GridCalcul.bare(randuri), { acum: d.acum, simbol, trades });
      if (profil) { await d.trimite("/api/istoric-bot?action=profil", { simbol, profil }); d.profile.set(simbol, profil); }
      st.facute[simbol] = { zi: azi, la: d.acum, profil: profil ? { simbol, zile: profil.zile, z12: profil.z12, z24: profil.z24 } : null };
      delete st.esuat[simbol];
      d.scrieStare(st);
      d.jurnal("profil", simbol, profil ? profil.zile + " zile, " + randuri.length + " bare" : "prea putine bare (" + randuri.length + ")");
    } catch (x) {
      st.esuat[simbol] = { la: d.acum, n: Math.min(8, (e ? e.n : 0) + 1) }; d.scrieStare(st);
      d.jurnal("profil ESEC", simbol, x.message);
    }
  }
}
