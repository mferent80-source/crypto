// I-865 (v100.336): paza paginilor Radarului - judecata, pură (probată în scripts/proba-v100336-paza.mjs). Rulatorul e scripts/vps/paza-pagini.mjs.
// O observație = ce a găsit browserul pe o pagină deschisă la o lățime, după ce s-a liniștit:
//   { pagina, latime, panou (id-ul panoului deschis | null), exceptii: [mesaj], latimeExtra: px peste ecran, frunze: [textul elementelor fără copii, la vedere] }
// Abaterile: pagina nu s-a deschis, excepții, derulare laterală, text stricat („undefined”, „NaN”, „[object Object]”), o stare de așteptare rămasă
// (rândul ÎNCEPE cu „Aștept / Socotesc / Se aduc / Se încarcă / Calculez / Citesc”). Pe Discord pleacă doar ce se repetă la a doua deschidere.
export const PAGINI = { dash: "Piața azi", tabloubot: "Tabloul botului", t212: "Trading 212" };
// v100.337 (el, 13.11: „fa idei”): la toate lățimile lui - telefonul (412), tableta (768), monitorul (1920) și cel mare (2560); 12 deschideri
// de ~55 s. Revizia: TERMEN_MIN = după el nu mai începe nicio pagină nouă; REDESCHIDE_MIN = după el nicio redeschidere (abaterea rămâne
// „neconfirmată”, doar în jurnal). Cel mai rău caz: pagină la 20 min + 2 + 1 + 2 = 25, sub limita sarcinii (30) - altfel sarcina oprea
// procesul și se pierdeau TOATE abaterile rondului (pleacă pe Discord doar la final).
export const LATIMI_IMPLICIT = [412, 768, 1920, 2560];
export const TERMEN_MIN = 20, REDESCHIDE_MIN = 23;
const STRICAT = /(^|[^A-Za-z])(undefined|NaN|\[object Object\])([^A-Za-z]|$)/;
const ASTEPT = /^(⏳\s*)?(aștept|socotesc|se aduc|se încarcă|calculez|citesc)(?![a-zăâîșț])/i;
// așteptări firești la o oră anume (înainte de tura de la 8:00 a listelor) - nu sunt abateri
const FIRESC = /listele de azi/i;

export function judeca(o) {
  o = o || {};
  const ab = [], scurt = (t) => String(t).replace(/\s+/g, " ").trim().slice(0, 100);
  if (!o.panou) { ab.push({ cheie: "deschis", text: "pagina nu s-a deschis (niciun panou la vedere)" }); return ab; }
  if (o.panou !== o.pagina) ab.push({ cheie: "panou", text: "s-a deschis alt panou (" + o.panou + ")" });
  for (const e of (o.exceptii || []).slice(0, 3)) ab.push({ cheie: "exc:" + scurt(e).slice(0, 60), text: "excepție: " + scurt(e) });
  if (Number(o.latimeExtra) > 2) ab.push({ cheie: "lateral", text: "derulare laterală (+" + Math.round(o.latimeExtra) + " px)" });
  const fr = (o.frunze || []).map(scurt).filter(Boolean);
  for (const t of fr.filter((x) => STRICAT.test(x)).slice(0, 3)) ab.push({ cheie: "stricat:" + t.slice(0, 60), text: "text stricat: „" + t + "”" });
  for (const t of fr.filter((x) => x.length < 120 && ASTEPT.test(x) && !FIRESC.test(x)).slice(0, 3)) ab.push({ cheie: "astept:" + t.slice(0, 60), text: "a rămas „" + t + "”" });
  if (fr.some((x) => /^FĂRĂ PAROLĂ$/i.test(x))) ab.push({ cheie: "parola", text: "aplicația nu primește parola (FĂRĂ PAROLĂ): paza nu vede datele" });   /* revizia v100.336 */
  return ab;
}
// ce s-a găsit la ambele deschideri (după cheie)
export function repetate(a, b) { const k = new Set((b || []).map((x) => x.cheie)); return (a || []).filter((x) => k.has(x.cheie)); }
// mesajul pentru Discord (forma lui canal-discord.mesajDiscord); null când nu e nimic de trimis
export function mesaj(gasite, motiv) {
  const l = (gasite || []).filter((g) => g.abateri && g.abateri.length);
  if (!l.length) return null;
  const n = l.reduce((s, g) => s + g.abateri.length, 0);
  return { nivel: "atentie", titlu: "Radar: " + (n === 1 ? "o abatere" : n + (n % 100 >= 20 || n % 100 === 0 ? " de" : "") + " abateri") + " pe pagini (" + (motiv || "verificare") + ")",
    mesaj: l.map((g) => (PAGINI[g.pagina] || g.pagina) + " · " + g.latime + " px: " + g.abateri.map((a) => a.text).join("; ")).join("\n").slice(0, 1900) + "\nSe repetă la a doua deschidere (după un minut)." };
}
// scriptul rulat în pagină: ce vede browserul, după ce pagina s-a liniștit
export const CITIRE = `(() => { const p = document.querySelector(".panel.on"); const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const fr = p ? [...p.querySelectorAll("*")].filter((e) => e.children.length === 0 && vis(e)).map((e) => (e.textContent || "").trim()).filter(Boolean) : [];
  return JSON.stringify({ panou: p ? p.id : null, latimeExtra: document.documentElement.scrollWidth - innerWidth, frunze: fr.slice(0, 4000) }); })()`;
