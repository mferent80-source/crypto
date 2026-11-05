// Unde rulează Radarul (colector v101.166, I-832 din auditul final 05.11.2026): serverul Radarului (:8788) și colectorul stau pe serverul
// închiriat (VPS), pornite de sarcina „Crypto Radar pornire” (C:\Users\Cimin\radar-server\porneste-radar.ps1, la pornire și la 10 minute).
// Mesajele de pană trimiteau încă la „PC-ul de acasă” și la PORNESTE-CRYPTO-RADAR.bat - urmate, ar fi pornit al doilea colector acasă ⇒
// alerte duble (tiparul alarmei Busolei din 05.11). Toate textele care spun unde să te uiți citesc de AICI; garda (abateriUnde, în
// scripts/garda-texte.mjs și în proba v100.306-c) respinge „de acasă” și „.bat” în mesajele de alertă. Modul pur, fără importuri:
// paznicul de pe Cloudflare (paznic/worker.mjs) îl ia în pachetul lui la `wrangler deploy`.
export const UNDE = Object.freeze({
  loc: "VPS",
  // cum îl numesc mesajele: „serverul Radarului de pe VPS”, „colectorul de pe VPS”
  server: "serverul Radarului de pe VPS",
  colector: "colectorul de pe VPS",
  // ce aș rula pe VPS (lansatorul e idempotent: pornește doar ce nu merge)
  repornire: 'schtasks /Run /TN "Crypto Radar pornire"',
  jurnal: "C:\\Users\\Cimin\\radar-server\\pornire.log",
  jurnalColector: "C:\\Users\\Cimin\\crypto\\data\\colector.log",
  jurnalServer: "C:\\Users\\Cimin\\radar-server\\wrangler.log",
  // cheile serverului (T212, Pionex, Discord) stau în .dev.vars din dosarul Radarului de pe VPS
  chei: "C:\\Users\\Cimin\\crypto\\.dev.vars",
});
// sfatul scurt, la persoana I (≤ 110 cu restul rândului): „Aș rula pe VPS schtasks /Run /TN "Crypto Radar pornire"”
export const SFAT_REPORNIRE = "Aș rula pe VPS " + UNDE.repornire;
// garda: ce NU are voie să apară într-un mesaj de alertă (titlu sau text) - trimiterea la PC-ul de acasă sau la un .bat de acolo
const INTERZIS_UNDE = [
  [/PC-ul de acas[ăa]|PC-ul t[ăa]u|calculatorul de acas[ăa]/i, "trimite la PC-ul de acasă (Radarul rulează pe VPS)"],
  [/(serverul|colectorul) de acas[ăa](?![\p{L}])/iu, "„de acasă” (Radarul rulează pe VPS)"],
  [/\.bat\b/i, "trimite la un .bat (pe VPS lansatorul e sarcina „Crypto Radar pornire”)"],
];
export function abateriUnde(text) {
  const t = String(text == null ? "" : text), ab = [];
  for (const [re, ce] of INTERZIS_UNDE) if (re.test(t)) ab.push(ce);
  return ab;
}
