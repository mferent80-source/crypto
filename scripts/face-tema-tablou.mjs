// Tema DESCHISĂ a Tabloului botului + scara de litere (v100.316; el, 10.11.2026: culorile, ordinea, aglomerația, literele - „aplică desenul nou”).
//
// Foaia public/app.css are culorile scrise direct (155× #141C24, 130× #26333F…) și probele vechi îi citesc textul, deci NU se rescrie.
// Scriptul o CITEȘTE și produce, din ea, un strat nou care stă la coada fișierului, între două marcaje:
//   - „scara”:   aceleași reguli, doar font-size, strâns pe 5 trepte (12 / 13,5 / 15 / 20 / 30), sub #tabloubot;
//   - „tema zi”: aceleași reguli, doar declarațiile cu culoare, trecute prin PALETA, sub #tabloubot.tbZi.
// Regulile altor pagini (#dash, #t212…) se sar. Parserul e pe acolade (comentarii, șiruri, @media / @container imbricate), nu pe regex.
//
//   node scripts/face-tema-tablou.mjs            rescrie blocul din public/app.css
//   node scripts/face-tema-tablou.mjs --check    iese 1 dacă blocul din fișier nu e cel produs acum
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const FISIER = path.join(RAD, "public", "app.css");
export const INCEPUT = "/* ==== v100.316 TEMA TABLOULUI: GENERAT de scripts/face-tema-tablou.mjs - nu se scrie de mână ==== */";
export const SFARSIT = "/* ==== v100.316 TEMA TABLOULUI: sfârșit ==== */";

// culoarea veche -> cea nouă; „fond” = când stă pe background / border (galbenul ca text e maroniu, ca fond rămâne galben)
export const PALETA = {
  "#0E141A": "#F2F4F7", "#141C24": "#FFFFFF", "#1A242E": "#F5F7FA", "#1E2A35": "#F5F7FA", "#22303C": "#E9EDF3", "#1A2633": "#F5F7FA",
  "#26333F": "#E0E5EC", "#35485A": "#C3CCD8", "#3B4254": "#C3CCD8",
  "#E6EDF3": "#0E1A2B", "#C9D6E2": "#2B3A4B", "#C9D1DC": "#2B3A4B", "#9FB3C4": "#48586E", "#8799AA": "#66768B", "#7E92A6": "#66768B", "#8B949E": "#66768B",
  "#26A96C": "#0B8A5F", "#4FD18B": "#0B8A5F", "#4FD096": "#0B8A5F", "#3FB950": "#0B8A5F",
  "#E5615A": "#CC3A32", "#E0524A": "#CC3A32", "#F2847C": "#CC3A32", "#F85149": "#CC3A32", "#F0665C": "#CC3A32", "#FF8A80": "#CC3A32",
  "#E9B949": { text: "#8A5A00", fond: "#E0A526" }, "#D29922": { text: "#8A5A00", fond: "#E0A526" }, "#F0A33A": { text: "#8A5A00", fond: "#E0A526" }, "#C9A227": { text: "#8A5A00", fond: "#E0A526" },
  "#5B8FC7": "#2456E6", "#82ACDA": "#2456E6", "#58A6FF": "#2456E6", "#5AA9E6": "#2456E6", "#6E9DD0": "#2456E6",
};
export const PALETA_RGB = {
  "159,179,196": "14,26,43", "255,255,255": "14,26,43", "135,153,170": "102,118,139", "230,237,243": "14,26,43",
  "91,143,199": "36,86,230", "233,185,73": "224,165,38", "38,169,108": "11,138,95", "79,209,139": "11,138,95", "224,82,74": "204,58,50", "229,97,90": "204,58,50",
  "26,36,46": "245,247,250", "20,28,36": "255,255,255", "14,20,26": "242,244,247", "38,51,63": "224,229,236", "53,72,90": "195,204,216", "34,48,60": "233,237,243",
};
const TREAPTA = (px) => (px <= 12.5 ? 12 : px <= 14 ? 13.5 : px <= 16.5 ? 15 : px <= 22 ? 20 : 30);

// ---- parser pe acolade ----
function sariSir(s, i) { const q = s[i]; i++; while (i < s.length && s[i] !== q) { if (s[i] === "\\") i++; i++; } return i + 1; }
export function fararaComentarii(s) { let o = "", i = 0; while (i < s.length) { if (s[i] === "/" && s[i + 1] === "*") { const j = s.indexOf("*/", i + 2); i = j < 0 ? s.length : j + 2; o += " "; } else if (s[i] === '"' || s[i] === "'") { const j = sariSir(s, i); o += s.slice(i, j); i = j; } else o += s[i++]; } return o; }
export function reguli(css) {   // -> [{ sel, corp } | { at, copii } | { at, corp }]
  const out = []; let i = 0; const n = css.length;
  while (i < n) {
    let j = i, par = 0;
    while (j < n) { const c = css[j]; if (c === '"' || c === "'") { j = sariSir(css, j); continue; } if (c === "(") par++; else if (c === ")") par--; else if (par === 0 && (c === "{" || c === ";" || c === "}")) break; j++; }
    if (j >= n) break;
    const cap = css.slice(i, j).trim();
    if (css[j] === ";" || css[j] === "}") { i = j + 1; continue; }   // @import …; sau o acoladă rătăcită
    let k = j + 1, ad = 1; while (k < n && ad > 0) { const c = css[k]; if (c === '"' || c === "'") { k = sariSir(css, k); continue; } if (c === "{") ad++; else if (c === "}") ad--; k++; }
    const corp = css.slice(j + 1, k - 1);
    if (cap.startsWith("@")) { if (/^@(media|container|supports|layer)\b/.test(cap)) out.push({ at: cap, copii: reguli(corp) }); else out.push({ at: cap, corp }); }
    else if (cap) out.push({ sel: cap, corp });
    i = k;
  }
  return out;
}
export function imparte(s, sep) { const o = []; let par = 0, a = 0; for (let i = 0; i < s.length; i++) { const c = s[i]; if (c === '"' || c === "'") { i = sariSir(s, i) - 1; continue; } if (c === "(" || c === "[") par++; else if (c === ")" || c === "]") par--; else if (c === sep && par === 0) { o.push(s.slice(a, i)); a = i + 1; } } o.push(s.slice(a)); return o.map((x) => x.trim()).filter(Boolean); }
const declaratii = (corp) => imparte(corp, ";").map((d) => { const i = d.indexOf(":"); return i < 0 ? null : { p: d.slice(0, i).trim(), v: d.slice(i + 1).trim() }; }).filter(Boolean);

// ---- culoarea ----
const E_FOND = (p) => /background|border|outline|shadow|fill|stroke|caret|accent-color|scrollbar|^--.*(fond|bg|linie|li)/i.test(p);
export function culoareNoua(p, v) {
  let w = v.replace(/#([0-9a-fA-F]{6})\b/g, (m) => { const x = PALETA[m.toUpperCase()]; return !x ? m : typeof x === "string" ? x : E_FOND(p) ? x.fond : x.text; });
  w = w.replace(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g, (m, r, g, b) => { const x = PALETA_RGB[r + "," + g + "," + b]; return x ? m.replace(/\d+\s*,\s*\d+\s*,\s*\d+/, x) : m; });
  return w;
}

// fond și text în ACEEAȘI regulă: după paletă, textul trebuie să se citească pe fondul lui (banda OFFLINE: galben cu text închis, nu deschis)
const LUM = (h) => { const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
export const contrast = (a, b) => { const x = LUM(a), y = LUM(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const HEX6 = /^#[0-9a-fA-F]{6}$/;
export function textCitibil(D) {   // D = [{p, v}] deja trecute prin paletă; întoarce culoarea de text bună sau null dacă nu e nimic de schimbat
  const bg = D.find((d) => (d.p === "background" || d.p === "background-color") && HEX6.test(d.v.replace(/s*!important$/, ""))), co = D.find((d) => d.p === "color" && HEX6.test(d.v.replace(/s*!important$/, "")));
  if (!bg || !co) return null; const b = bg.v.replace(/s*!important$/, ""), c = co.v.replace(/s*!important$/, "");
  if (contrast(b, c) >= 4.5) return null; return contrast(b, "#0E1A2B") >= contrast(b, "#FFFFFF") ? "#0E1A2B" : "#FFFFFF";
}

// ---- selectorul ----
// v100.326 (el, 11.11.2026: „pagina Trading 212 … în aceleași condiții ca și pagina botului”): două rădăcini. Regulile comune intră sub
// :is(#tabloubot,#t212) (aceeași putere ca #tabloubot), ale fiecărei pagini sub ea; restul paginilor se sar.
export const RADACINI = ["tabloubot", "t212"];
const COMUN = ":is(" + RADACINI.map((r) => "#" + r).join(",") + ")";
function panouriStraine(html) { return [...html.matchAll(/<section[^>]*class="panel[^"]*"[^>]*id="([A-Za-z0-9_-]+)"|<section[^>]*id="([A-Za-z0-9_-]+)"[^>]*class="panel/g)].map((m) => m[1] || m[2]).filter((x) => !RADACINI.includes(x)); }
export function selectorSub(sel, radacina, straine) {   // radacina: „#tabloubot” (scara) sau „#tabloubot.tbZi” (tema zi) - partea de după id se pune pe orice rădăcină
  const o = [], sufix = radacina.replace(/^#tabloubot/, "");
  for (const s of imparte(sel, ",")) {
    if (straine.some((id) => new RegExp("#" + id + "(?![A-Za-z0-9_-])").test(s))) continue;
    if (/^(:root|html|body)\s*$/.test(s) || /^(\*|::?[a-z-]+)$/.test(s)) continue;   // variabilele rădăcinii se dau separat
    if (s.includes(COMUN)) { o.push(s.split(COMUN).join(COMUN + sufix)); continue; }   // revizia: ambele rădăcini deodată, nu doar prima
    const proprie = RADACINI.find((r) => new RegExp("#" + r + "(?![A-Za-z0-9_-])").test(s));
    if (proprie) { o.push(s.replace(new RegExp("#" + proprie + "(?![A-Za-z0-9_-])"), "#" + proprie + sufix)); continue; }
    const rad = COMUN + sufix, m = s.match(/^((?:html|body|:root)[^\s>+~]*|\.pzDemo)(\s+)(.*)$/s);
    o.push(m ? m[1] + " " + rad + " " + m[3] : rad + " " + s);
  }
  return o.join(",");
}

export function genereaza(css, html) {
  const curat = fararaComentarii(css), arbore = reguli(curat), straine = panouriStraine(html);
  const scara = [], zi = [], vars = [];
  const trece = (lista, inScara, inZi) => {
    for (const r of lista) {
      if (r.copii) { const a = [], b = []; trece(r.copii, a, b); if (a.length) inScara.push(r.at + "{" + a.join("") + "}"); if (b.length) inZi.push(r.at + "{" + b.join("") + "}"); continue; }
      if (!r.sel) continue;
      const D = declaratii(r.corp);
      if (/^(:root|html|body)(\s*,\s*(:root|html|body))*$/.test(r.sel.trim())) { for (const d of D) if (d.p.startsWith("--")) { const w = culoareNoua(d.p, d.v); if (w !== d.v) vars.push(d.p + ":" + w); } }
      const fs_ = [], cul = [], noi = D.map((d) => ({ p: d.p, v: culoareNoua(d.p, d.v) })), tc = textCitibil(noi);
      for (const d of D) {
        if (d.p === "font-size") { const m = d.v.match(/^(\d+(?:\.\d+)?)px(\s*!important)?$/); if (m) { const t = TREAPTA(+m[1]); if (t !== +m[1]) fs_.push("font-size:" + t + "px" + (m[2] ? "!important" : "")); } }
        else if (d.p === "font" || d.p === "font-family") continue;
        else { let w = culoareNoua(d.p, d.v); if (tc && d.p === "color") w = tc + (/!important$/.test(d.v) ? "!important" : ""); if (w !== d.v) cul.push(d.p + ":" + w); }
      }
      if (fs_.length) { const s = selectorSub(r.sel, "#tabloubot", straine); if (s) inScara.push(s + "{" + fs_.join(";") + "}"); }
      if (cul.length) { const s = selectorSub(r.sel, "#tabloubot.tbZi", straine); if (s) inZi.push(s + "{" + cul.join(";") + "}"); }
    }
  };
  trece(arbore, scara, zi);
  const uniceVars = [...new Map(vars.map((v) => [v.slice(0, v.indexOf(":")), v])).values()];
  return [INCEPUT, "/* scara de litere: 12 / 13,5 / 15 / 20 / 30 */", scara.join("\n"), "/* tema zi: variabilele rădăcinii, apoi regulile cu culoare */", COMUN + ".tbZi{" + uniceVars.join(";") + "}", zi.join("\n"), SFARSIT].join("\n");
}

export function faraBloc(css) { const a = css.indexOf(INCEPUT), b = css.indexOf(SFARSIT); return a >= 0 && b > a ? css.slice(0, a) + css.slice(b + SFARSIT.length) : css; }
export function blocDin(css) { const a = css.indexOf(INCEPUT), b = css.indexOf(SFARSIT); return a >= 0 && b > a ? css.slice(a, b + SFARSIT.length) : null; }

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const css = fs.readFileSync(FISIER, "utf8"), html = fs.readFileSync(path.join(RAD, "public", "index.html"), "utf8"), NL = css.includes("\r\n") ? "\r\n" : "\n";
  const a = css.indexOf(INCEPUT);
  if (a < 0) { console.log("PICA: lipsește marcajul de început din public/app.css - blocul are un loc fix, pus de mână o dată"); process.exit(1); }
  const baza = faraBloc(css), bloc = genereaza(baza, html).split("\n").join(NL);
  if (process.argv.includes("--check")) { const ok = blocDin(css) === bloc; console.log(ok ? "tema Tabloului e la zi" : "PICA: blocul din public/app.css nu e cel produs acum - rulează node scripts/face-tema-tablou.mjs"); process.exit(ok ? 0 : 1); }
  fs.writeFileSync(FISIER, css.slice(0, a) + bloc + css.slice(css.indexOf(SFARSIT) + SFARSIT.length));
  console.log("scris: " + bloc.length + " caractere, " + bloc.split(NL).length + " rânduri");
}
