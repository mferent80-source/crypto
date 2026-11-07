// GARDA CONVENȚIILOR LUI PE ECRAN (v100.306, I-837; auditul final 05.11: „−5,62%”, „$25.17”, „2401 boți”, „−6430,9 USDT”, WIN/LOSS, „ASTEAPTA”
// se întorceau după fiecare versiune, de la 23.10). Modul pur, fără efecte la import: îl folosește proba de telefon (proba-ecran-telefon.mjs),
// care citește TEXTUL VĂZUT al fiecărei pagini zilnice, și proba lui (proba-v100306-a2.mjs).
//
// Regulile lui (memoria: „REZULTATELE cu O SINGURĂ zecimală”, 03.10; română peste tot):
//   zecimale  - un REZULTAT (procent ≥ 1%, sumă cu semn ≥ 0,1) cu 2–3 zecimale: „−5,62%”, „+57,20 lei”, „−2,80 USDT”;
//   punct     - punct zecimal la un rezultat: „49.0%”, „-5.5%”, „$25.17”, „VIX 16.6”;
//   minus     - minusul ASCII „-” lipit de cifră, ca semn (nu interval „1-2”, nu dată „2026-11-05”);
//   mii       - de la 1.000 în sus fără punctul miilor, lângă o unitate: „2401 boți”, „6430,9 USDT”, „1500 lei”;
//   engleza   - cuvintele din listă (WIN, LOSS, score, Neutral, ASTEAPTA…).
// EXCEPȚII SCRISE (nu se socotesc abateri):
//   - prețurile, cu zecimalele lor: un număr FĂRĂ semn și fără % („0.3419”, „75.923,90 USDT”, „74,80 EUR”); la Pionex și punctul (se copiază
//     în Pionex); prețurile în $ / € se scriu totuși cu virgulă („$25.17” e abatere de punct);
//   - ratele mici, sub 1%, care descriu o setare (pasul gridului „0,30%”, netul pe grilă „0,26%”, funding-ul „0,0100%”): cu o zecimală ar ieși
//     toate „0,3%” = pasul;
//   - sumele mici, sub 0,1 („0,04 USDT”, TextRo.zecMici): cu o zecimală ar ieși „0,0”;
//   - ecoul a ce tastează omul: câmpurile (input / select / textarea) nu se citesc deloc, iar un element marcat `data-conv-ecou` e sărit;
//   - graficele (svg: scara de prețuri, axele) și codul (code / pre: rândul pentru TradingView) - prețuri și coduri, nu rezultate;
//   - datele („05.11”, „05.11.2026”, „6.10” pe axă), orele, versiunile („v2.6”, „v100.306”), coeficienții fără unitate („0,72”, „Brier 0,077”);
//   - NUMELE robotului de market breadth, cerute de el explicit „cu nume” (14.10): „Master Score”, „Bearish Signal”, zonele (Strong / Neutral…,
//     marcate `data-conv-nume`) - nume proprii, nu cuvinte de tradus;
//   - textul CITAT dintr-o sursă externă, în limba și cu cifrele ei - titlurile de știri (Piața azi, Trading 212), marcate `data-conv-citat`
//     (v100.309, 07.11: „employment rate slips to 4.1%” pica proba de telefon; punctul e al agenției, nu un rezultat al Radarului).
// Ce NU vede: textul pliat (un <details> închis nu se citește - „judecă după poză”: ce e la vedere).

export const CUVINTE_ENGLEZE = ["WIN", "LOSS", "Win", "Loss", "score", "Score", "Neutral", "NEUTRAL", "ASTEAPTA", "Asteapta", "BULLISH", "BEARISH", "Bullish", "Bearish", "LOADING", "Loading"];

// paginile zilnice + uneltele (Zilnic și Unelte din meniu, fără Setări / Starea aplicației: acolo sunt nume tehnice); „Laboratorul vechi”
// (34 de pagini în engleză, Quant Engine…) nu intră: e o listă a lui separată, nu ecranul de zi cu zi
export const PAGINI_CONVENTII = ["dash", "tabloubot", "sugestii", "gridset", "gridsim", "carnet", "jurnaltrade", "comportament", "tradezilei", "rangefilter", "t212", "salt", "scan", "alerts", "montecarlo", "contintreg", "deriv", "stocks", "rezultate", "account"];

const UNITATE = "(?:USDT|USD|lei|RON|EUR|€|\\$|%|boți|bot|trade-uri|trade|acțiuni|monede|cazuri|porniri|zile|bare)";
const nrDin = (s) => Number(String(s).replace(/\./g, "").replace(",", "."));

// text → [{ tip, text }] (fragmentul cu ~30 de caractere în jur)
export function abateri(text) {
  const t = String(text == null ? "" : text).replace(/ /g, " "), out = [], vazut = new Set();
  const pune = (tip, i, n) => { const k = tip + "|" + i; if (vazut.has(k)) return; vazut.add(k); out.push({ tip, text: t.slice(Math.max(0, i - 25), i + n + 25).replace(/\s+/g, " ").trim() }); };
  let m;
  // 1. zecimale: procente ≥ 1% cu 2+ zecimale (cu sau fără semn)
  const rePct = /(^|[^\d.,])([+−-]?)(\d{1,3}(?:\.\d{3})*|\d+),(\d{2,})\s?%/g;
  while ((m = rePct.exec(t))) { const v = Math.abs(nrDin(m[3] + "," + m[4])); if (v >= 1) pune("zecimale", m.index + m[1].length, m[0].length - m[1].length); }
  // sume cu semn (+ / −), 2–3 zecimale și o monedă lângă (USDT, lei, $, €), de la 0,1 în sus; coeficienții fără unitate (β −0,16, Sharpe −1,69,
  // IC −0,19…0,03) nu sunt sume
  const reSemn = /(^|[^\w.,])([+−])(\d{1,3}(?:\.\d{3})*|\d+),(\d{2,3})(?![\d%])(?=\s?(?:USDT|USD|lei|RON|EUR|€|\$)(?![a-zăîșțâ]))/g;
  while ((m = reSemn.exec(t))) { const v = Math.abs(nrDin(m[3] + "," + m[4])); if (v >= 0.1) pune("zecimale", m.index + m[1].length, m[0].length - m[1].length); }
  // (o sumă FĂRĂ semn, „74,80 EUR”, „$4,22”, „0,3345”, e un PREȚ - acțiunile EU / US și monedele își păstrează zecimalele: excepție)
  // 2. punct zecimal la un rezultat: urmat de %, cu semn în față, după „$” / „€”, sau un număr ≥ 10 cu o zecimală după un nume de indice („VIX 16.6”)
  const rePunct = /(^|[^\w.,$€])([+−-]?)([$€]?)(\d+)\.(\d{1,2})(?![\d.])(\s?%)?/g;
  while ((m = rePunct.exec(t))) {
    const semn = !!m[2], ban = !!m[3], pct = !!m[6], a = Number(m[4]), b = m[5];
    const data = !semn && !ban && !pct && b.length === 2 && a >= 1 && a <= 31 && Number(b) >= 1 && Number(b) <= 12;   // „05.11”, „27.10”
    const dataScurta = !semn && !ban && !pct && b.length === 2 && /\d\.\d{2}\.\d{2,4}/.test(t.slice(m.index + m[1].length, m.index + m[1].length + 12));
    const ver = /[vV]\s?$/.test(t.slice(Math.max(0, m.index + m[1].length - 2), m.index + m[1].length));
    const indice = !semn && !ban && !pct && /(VIX|DXY|RSI|ADX|MM\d*)\s$/.test(t.slice(Math.max(0, m.index + m[1].length - 6), m.index + m[1].length));
    if (!ver && !data && !dataScurta && (pct || semn || ban || indice)) pune("punct", m.index + m[1].length, m[0].length - m[1].length);
  }
  // 3. minusul ASCII ca semn: „-5,5%”, „ -2 USDT” (nu „1-2”, nu „2026-11-05”, nu „I-824”, nu „4h-1z”)
  const reMinus = /(^|[\s(:=·/[])-(?=\d)/g;
  while ((m = reMinus.exec(t))) pune("minus", m.index + m[1].length, 6);
  // 4. de la 1.000 în sus fără punctul miilor, lângă o unitate („2401 boți”, „6430,9 USDT”) sau cu semn („−6430,9”)
  const reMii = new RegExp("(^|[^\\w.,−+-])([+−-]?)(\\d{4,})(,\\d+)?(\\s?(?:de\\s)?" + UNITATE + "(?![a-zăîșțâ]))?", "g");
  while ((m = reMii.exec(t))) {
    const an = !m[2] && !m[4] && /^(19|20)\d\d$/.test(m[3]);   // un an („2026”), nu o sumă
    if (!an && (m[5] || m[2])) pune("mii", m.index + m[1].length, m[0].length - m[1].length);
  }
  // 5. cuvintele din listă
  const reEn = new RegExp("(^|[^A-Za-zĂÎȘȚÂăîșțâ])(" + CUVINTE_ENGLEZE.join("|") + ")(?![A-Za-zĂÎȘȚÂăîșțâ])", "g");
  const tEn = t.replace(/Master Score|Bearish Signal/g, (s) => " ".repeat(s.length));   // numele robotului (excepție scrisă sus)
  while ((m = reEn.exec(tEn))) pune("engleza", m.index + m[1].length, m[2].length);
  return out;
}

// funcția care rulează ÎN PAGINĂ (prin CDP, Runtime.evaluate): textul văzut al panoului deschis, fără câmpuri, grafice, cod și `data-conv-ecou`;
// un text pliat (details închis, display:none) n-are dreptunghiuri ⇒ nu se citește
export const TEXT_VAZUT_JS = `(() => {
  const rad = document.querySelector(".panel.on"); if (!rad) return "";
  const sari = "input,select,textarea,svg,code,pre,script,style,[data-conv-ecou],[data-conv-nume],[data-conv-citat],[hidden]";
  const w = document.createTreeWalker(rad, NodeFilter.SHOW_TEXT), bucati = [];
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    const p = n.parentElement; if (!p || p.closest(sari)) continue;
    const s = n.nodeValue.replace(/\\s+/g, " ").trim(); if (!s) continue;
    // un <details> închis își ține conținutul cu content-visibility:hidden, iar getClientRects îl așază totuși ⇒ întâi checkVisibility
    if (p.checkVisibility ? !p.checkVisibility({ visibilityProperty: true }) : !p.getClientRects().length) continue;
    let d = p.closest("details"), ascuns = false;
    while (d) { if (!d.open && !(p.closest("summary") && p.closest("summary").parentElement === d)) { ascuns = true; break; } d = d.parentElement && d.parentElement.closest("details"); }
    if (ascuns) continue;
    bucati.push(s);
  }
  return bucati.join(" ¦ ");
})()`;
