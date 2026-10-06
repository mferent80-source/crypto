// v101.81 (pagina Sugestii, el 06.10: „EU = DAX + CAC + AEX + ale tale”): universul acțiunilor europene, în forma tickerelor T212
// (SIMBOL + bursa: d = Xetra .DE, p = Paris .PA, a = Amsterdam .AS, l = Londra .L - maparea e în functions/_shared/simboluri.js).
// O companie cotată pe două burse intră o singură dată (Airbus pe Xetra, ArcelorMittal pe Amsterdam). Tickerele care nu se găsesc la Yahoo
// se sar și se numără în jurnal (componența indicilor se schimbă: lista se revede de câteva ori pe an).
export const DAX40 = ["ADS", "AIR", "ALV", "BAS", "BAYN", "BEI", "BMW", "BNR", "CBK", "CON", "DTG", "DBK", "DB1", "DHL", "DTE", "EOAN", "FRE", "G1A", "HNR1", "HEI",
  "HEN3", "IFX", "MBG", "MRK", "MTX", "MUV2", "P911", "PAH3", "QIA", "RHM", "RWE", "SAP", "SRT3", "SIE", "ENR", "SHL", "SY1", "VNA", "VOW3", "ZAL"].map((s) => s + "d_EQ");
export const CAC40 = ["AC", "AI", "CS", "BNP", "EN", "CAP", "CA", "ACA", "BN", "DSY", "EDEN", "ENGI", "EL", "ERF", "RMS", "KER", "OR", "LR", "MC", "ML", "ORA", "RI", "PUB",
  "RNO", "SAF", "SGO", "SAN", "SU", "GLE", "STLAP", "STMPA", "TEP", "HO", "TTE", "URW", "VIE", "DG", "BVI"].map((s) => s + "p_EQ");
export const AEX25 = ["ABN", "ADYEN", "AGN", "AD", "AKZA", "MT", "ASM", "ASML", "ASRNL", "BESI", "DSFIR", "EXO", "HEIA", "IMCD", "INGA", "KPN", "NN", "PHIA", "PRX", "RAND",
  "REN", "SHELL", "UMG", "UNA", "WKL"].map((s) => s + "a_EQ");
// tickerele EU ale lui (din istoricul T212): orice „…X_EQ” care nu e US / CA / AT, cu bursa cunoscută (d / p / a / l)
export function aleLuiEU(umpleri) {
  // 06.10: la Londra, o cifră în simbol = ETP cu levier (3SGG, SMI3, MET1…) - salturi ×100 la unitate și reverse split, nu acțiuni ⇒ afară
  const t = new Set(); (Array.isArray(umpleri) ? umpleri : []).forEach((x) => { const k = String(x && x.ticker || ""); if (/^[A-Z0-9]{1,12}[dpalsm]_EQ$/.test(k) && !/^[A-Z]*\d[A-Z0-9]*l_EQ$/.test(k)) t.add(k);   /* revizia: + Elveția (s), Milano (m) */ });
  return [...t];
}
export function universEU(umpleri) { return [...new Set([...aleLuiEU(umpleri), ...DAX40, ...CAC40, ...AEX25])]; }
