// v100.113 (el, 06.10: „în pagina din meniu să-mi spună tot ce poate” + „fă explicit, așa aflu dacă am un comportament greșit — boți și stock”):
// pagina „Monte Carlo · riscul tău” - desenează raportul de noapte al colectorului (RiscLuna.raport, /api/istoric-bot?action=risc).
// rlHtml e fără DOM (proba o rulează în vm); rlPorneste / rlAlegeK leagă pagina. Vechiul Monte Carlo pe semnale stă pliat dedesubt.
var rlStare = { raport: null, la: 0, inLucru: false, eroare: null, kBoti: null, kAct: null };
function rlEsc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
function rlV1(x) { var r = Math.round(x * 10) / 10, p = Math.abs(r).toFixed(1).split("."); return (r < 0 ? "−" : r > 0 ? "+" : "") + p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "," + p[1]; }   /* mii cu punct (revizia) */
function rlN(x) { var n = Number(x); return isFinite(n) ? n : 0; }   // numerele din raport, curățate înainte de HTML (revizia)
function rlMii(x) { var r = Math.round(Math.abs(x)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "."); return (x < 0 ? "−" : x > 0 ? "+" : "") + r; }
function rlPct(x) { return x == null ? "—" : Math.round(x * 100) + "%"; }
function rlBani(x, unit) { return unit === "lei" ? rlMii(x) + " lei" : rlV1(x) + " USDT"; }
function rlCate(n, sg, pl) { return typeof TextRo !== "undefined" && TextRo.cate ? TextRo.cate(n, sg, pl) : n + " " + pl; }
// histograma lunilor simulate: sub zero roșu, peste zero verde, luna proastă (5%) marcată
function rlHist(mc, unit) {
  var h = mc.hist, W = 900, H = 220, L = 12, B = 34, T = 14, nb = h.h.length, w = (W - L * 2) / nb, max = Math.max.apply(null, h.h.concat([1])), sx = function (v) { return L + (v - h.lo) / (h.hi - h.lo) * (W - L * 2); };
  var s = '<svg class="rlSvg" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Lunile simulate">';
  for (var g = 0; g <= 2; g++) { var y = T + (H - T - B) * (1 - g / 2); s += '<line x1="' + L + '" x2="' + (W - L) + '" y1="' + y + '" y2="' + y + '" stroke="var(--line-soft)"/>'; }
  h.h.forEach(function (c, i) { var a = h.lo + i * h.w, bh = c / max * (H - T - B), mij = a + h.w / 2;
    s += '<rect x="' + (L + i * w + 1).toFixed(1) + '" y="' + (H - B - bh).toFixed(1) + '" width="' + Math.max(1, w - 2).toFixed(1) + '" height="' + bh.toFixed(1) + '" rx="2" fill="' + (mij < 0 ? "var(--bad)" : "var(--good)") + '" opacity="' + (mij < mc.p5 ? 1 : 0.5) + '"><title>' + rlEsc("între " + rlBani(a, unit) + " și " + rlBani(a + h.w, unit) + ": " + c + (mc.n ? " din " + mc.n : "") + " de luni") + "</title></rect>"; });
  var z = sx(0); if (z > L && z < W - L) s += '<line x1="' + z.toFixed(1) + '" x2="' + z.toFixed(1) + '" y1="' + T + '" y2="' + (H - B) + '" stroke="var(--text)" stroke-dasharray="3 3"/><text x="' + (z + 4).toFixed(1) + '" y="' + (T + 10) + '">0</text>';
  var p = sx(mc.p5); s += '<line x1="' + p.toFixed(1) + '" x2="' + p.toFixed(1) + '" y1="' + T + '" y2="' + (H - B) + '" stroke="var(--bad)" stroke-width="2"/><text x="' + (p + 4).toFixed(1) + '" y="' + (T + 26) + '" class="rlRau">luna proastă ' + rlEsc(rlBani(mc.p5, unit)) + "</text>";
  [h.lo, (h.lo + h.hi) / 2, h.hi].forEach(function (v, i) { s += '<text x="' + sx(v).toFixed(1) + '" y="' + (H - 12) + '" text-anchor="' + (i === 0 ? "start" : i === 2 ? "end" : "middle") + '">' + rlEsc(rlBani(v, unit)) + "</text>"; });
  return s + "</svg>";
}
function rlConcl(l) {
  if (!l || !l.length) return '<p class="tbSub">Nimic de spus încă.</p>';
  return '<div class="rlConcl">' + l.map(function (x) { return '<div class="rlCon rl-' + rlEsc(x.nivel) + '"><b>' + rlEsc(x.titlu) + "</b><p>" + rlEsc(x.text) + "</p>" + (x.faCe ? '<p class="rlFac">👉 ' + rlEsc(x.faCe) + "</p>" : "") + "</div>"; }).join("") + "</div>";
}
function rlObiceiuri(l, tip, unit) {
  var ET = { "dovedit-rau": ["dovedit rău", "rl-rau"], "dovedit-bun": ["dovedit bun", "rl-bine"], "la-limita-rau": ["la limită (rău)", "rl-atentie"], "la-limita-bun": ["la limită (bun)", "rl-info"], "nedovedit": ["nedovedit", "rl-info"], "prea puțini": ["prea puțini", "rl-info"], "prea puține": ["prea puține", "rl-info"] };
  // revizia: media pe bot / poziție (totalurile pe grupuri de mărimi diferite sugerau efecte mari acolo unde verdictul e nedovedit)
  return '<div class="rlTab"><table><thead><tr><th>Obiceiul</th><th>Verdict</th><th>Ce arată</th><th>' + (tip === "boti" ? "Media pe bot, cu / fără (la suma de acum)" : "Media pe poziție, cu / fără") + '</th></tr></thead><tbody>' + (l || []).map(function (x) { var e = ET[x.stare] || [x.stare, "rl-info"];
    return "<tr><td>" + rlEsc(x.nume) + '</td><td><span class="rlPill ' + e[1] + '">' + rlEsc(e[0]) + "</span></td><td>" + rlEsc(RiscLuna.textObicei(x, tip)) + '</td><td class="rlNr">' + rlEsc((x.cu ? rlBani(rlN(x.banCu) / x.cu, unit) : "—") + " / " + (x.fara ? rlBani(rlN(x.banFara) / x.fara, unit) : "—")) + "</td></tr>"; }).join("") + "</tbody></table></div>";
}
function rlSuprav(l, unitate) {
  return '<div class="rlTab"><table><thead><tr><th>Ajunse la</th><th>Câte</th><th>Pe plus</th><th>Pierdere peste 5%</th><th>Media</th></tr></thead><tbody>' + (l || []).filter(function (x) { return x.n > 0; }).map(function (x) {
    return "<tr><td>" + rlEsc(unitate === "ore" ? x.h + " h" : rlCate(x.h, "zi", "zile")) + '</td><td class="rlNr">' + rlN(x.n) + '</td><td class="rlNr">' + rlPct(x.pePlus) + '</td><td class="rlNr">' + rlPct(x.mari) + '</td><td class="rlNr ' + (x.medie < 0 ? "bad" : "good") + '">' + rlEsc(rlV1(x.medie * 100)) + "%</td></tr>"; }).join("") + "</tbody></table></div>";
}
function rlParte(tip, P, k, conc) {
  var boti = tip === "boti", unit = boti ? "USDT" : "lei", noun = boti ? ["bot", "boți"] : ["poziție", "poziții"];
  var mc = (P.mc || []).filter(function (m) { return m.K === k; })[0] || (P.mc || [])[0];
  if (!mc) return "";
  var tau = !!(P.ritm && mc.K === P.ritm.K);
  var bt = (P.mc || []).map(function (m, i) { return '<button type="button" class="rlK" aria-pressed="' + (m.K === mc.K) + '" data-action-click="rlAlegeK(\'' + tip + "'," + rlN(m.K) + ')">' + (P.ritm && m.K === P.ritm.K ? "ritmul tău: " : "") + rlN(m.K) + "</button>"; }).join("");
  var cif = [["Bani rulați într-o lună", rlBani(mc.K * mc.S, unit).replace("+", ""), rlCate(rlN(mc.K), noun[0], noun[1]) + " × " + rlBani(mc.S, unit).replace("+", "")], ["Luna obișnuită", rlBani(mc.med, unit), "jumătate din luni sub, jumătate peste"],
    ["Luna proastă (1 din 20)", rlBani(mc.p5, unit), "cam o dată la 20 de luni"], ["Luna foarte proastă (1 din 100)", rlBani(mc.p1, unit), "rar, dar se întâmplă"], ["Luna bună (1 din 20)", rlBani(mc.p95, unit), "ce câștigi într-o lună bună"]];
  var h = '<section class="rlSec"><h3>' + (boti ? "Boții tăi" : "Acțiunile tale") + '</h3><p class="rlRasp">' + rlEsc(RiscLuna.textLuna(mc, unit, noun, tau)) + "</p>"
    + (P.ritm && P.ritm.n30 === 0 ? '<p class="tbSub">' + rlEsc("În ultimele 30 de zile n-ai pornit " + (boti ? "niciun bot" : "nicio poziție") + "; suma e cea din ultimele tale " + (boti ? "porniri" : "poziții") + ".") + "</p>" : "")
    + '<div class="rlAlege" role="group" aria-label="Câte ' + noun[1] + ' pe lună"><span>Câte pe lună:</span>' + bt + "</div>"
    + '<div class="rlCifre">' + cif.map(function (c, i) { return '<div class="rlCifra"><span>' + rlEsc(c[0]) + '</span><b class="' + (i === 2 || i === 3 ? "bad" : i === 4 ? "good" : "") + '">' + rlEsc(c[1]) + "</b><small>" + rlEsc(c[2]) + "</small></div>"; }).join("") + "</div>"
    + '<p class="tbSub">' + rlEsc((mc.n ? mc.n.toLocaleString("ro-RO") + " de luni simulate" : "Lunile simulate") + (mc.legat ? ", fiecare dintr-o fereastră reală de 30 de zile din istoria ta (lunile proaste vin cu toate pozițiile deodată)" : ", din tot istoricul (prea puține ferestre de 30 de zile)") + ".") + "</p>" + rlHist(mc, unit)
    + "<h4>Ce înseamnă pentru tine</h4>" + rlConcl(conc) + "<h4>Obiceiurile tale</h4>" + rlObiceiuri(P.comportament, tip, unit)
    + "<h4>" + (boti ? "Din boții care au ajuns la o vârstă, cum s-au terminat" : "Din pozițiile ținute peste un timp, cum s-au încheiat") + "</h4>" + rlSuprav(P.supravietuire, boti ? "ore" : "zile");
  var d = P.desc || {};
  if (boti) {
    h += "<h4>Cât i-ai ținut</h4><div class=\"rlTab\"><table><thead><tr><th>Cât a stat</th><th>Boți</th><th>Pe plus</th><th>Media</th><th>La suma de acum</th><th>Comision la suma de acum</th></tr></thead><tbody>" + (d.durate || []).map(function (x) {
      return "<tr><td>" + rlEsc((x.pana === null ? "peste " + x.de + " h" : x.de + "–" + x.pana + " h").replace(/\./g, ",")) + '</td><td class="rlNr">' + rlN(x.n) + '</td><td class="rlNr">' + rlPct(x.pePlus) + '</td><td class="rlNr">' + (x.medie == null ? "—" : rlEsc(rlV1(x.medie * 100)) + "%") + '</td><td class="rlNr ' + (x.laS < 0 ? "bad" : "good") + '">' + rlEsc(rlBani(x.laS, unit)) + '</td><td class="rlNr bad">' + rlEsc(rlBani(x.comisionLaS, unit)) + "</td></tr>"; }).join("") + "</tbody></table></div>";
    if (d.bani) h += '<p class="tbSub">Banii reali din ' + rlCate(d.n, "bot", "boți") + ": grilele " + rlEsc(rlBani(d.bani.grile, unit)) + ", comisioanele " + rlEsc(rlBani(d.bani.comisioane, unit)) + ", funding " + rlEsc(rlBani(d.bani.funding, unit)) + ", rezultatul " + rlEsc(rlBani(d.bani.realizat, unit)) + ".</p>";
    if (d.luni && d.luni.length) h += "<h4>Lunile reale, la suma de acum</h4><div class=\"rlTab\"><table><thead><tr><th>Luna</th><th>Boți</th><th>Pe plus</th><th>Rezultat</th><th>Pierderi peste 5%</th></tr></thead><tbody>" + d.luni.filter(function (x) { return x.n >= 5; }).map(function (x) {
      return "<tr><td>" + rlEsc(x.m) + '</td><td class="rlNr">' + rlN(x.n) + '</td><td class="rlNr">' + rlPct(x.pePlus / x.n) + '</td><td class="rlNr ' + (x.laS < 0 ? "bad" : "good") + '">' + rlEsc(rlBani(x.laS, unit)) + '</td><td class="rlNr bad">' + (x.mari ? rlEsc(x.mari + " · " + rlBani(x.mariLaS, unit)) : "—") + "</td></tr>"; }).join("") + "</tbody></table></div>";
  } else {
    if (d.tranzactii && d.castigMediu != null && d.pierdereMedie != null && d.zileCastig != null && d.zilePierdere != null) h += '<p class="tbSub">' + rlEsc(rlCate(d.tranzactii, "vânzare", "vânzări") + ", " + rlPct(d.pePlus) + " pe plus; câștigul mediu " + rlV1(d.castigMediu * 100) + "%, pierderea medie " + rlV1(d.pierdereMedie * 100) + "%; câștigurile le ții ~" + rlCate(Math.max(1, Math.round(d.zileCastig)), "zi", "zile") + ", pierderile ~" + rlCate(Math.max(1, Math.round(d.zilePierdere)), "zi", "zile") + " (mediana).") + "</p>";
    if (d.maiRele && d.maiRele.length) h += '<p class="tbSub">Cele mai mari pierderi: ' + rlEsc(d.maiRele.map(function (x) { return x.s + " " + rlBani(x.lei, unit) + " (" + rlV1(x.pct * 100) + "%, " + rlCate(Math.round(x.zile), "zi", "zile") + ")"; }).join(" · ")) + ".</p>";
  }
  return h + "</section>";
}
function rlHtml(rp, st) {
  st = st || {};
  if (!rp || (!rp.boti && !rp.actiuni)) return '<p class="tbSub">Raportul se face o dată pe noapte, de colector (arhiva boților + istoricul T212). Încă nu există: pornește colectorul și revino după prima lui tură.</p>';
  var c = RiscLuna.concluzii(rp), d = new Date(rp.la), p = function (n) { return String(n).padStart(2, "0"); };
  var h = '<p class="tbSub rlLa">Raportul de la ' + p(d.getDate()) + "." + p(d.getMonth() + 1) + ", ora " + p(d.getHours()) + ":" + p(d.getMinutes()) + " · se reface o dată pe noapte · e istoria ta, nu o promisiune.</p>";
  if (rp.boti) h += rlParte("boti", rp.boti, st.kBoti || (rp.boti.ritm && rp.boti.ritm.K), c.boti);
  if (rp.actiuni) h += rlParte("actiuni", rp.actiuni, st.kAct || (rp.actiuni.ritm && rp.actiuni.ritm.K), c.actiuni);
  h += '<details class="rlMetoda"><summary>Cum am socotit (regula fixată înainte de cifre)</summary><ul>'
    + ["Boții: futures grid închiși din 1 ianuarie; rezultatul unui bot = profitul realizat (cu comisioane și funding) împărțit la suma pusă, apoi înmulțit cu suma ta de acum. Monte Carlo doar pe levier de cel mult 5×.",
      "Ritmul tău: câți boți / câte poziții ai pornit în ultimele 30 de zile; suma de acum = mediana lor.",
      "O lună simulată = atâtea rezultate trase dintr-o fereastră reală de 30 de zile, aleasă la întâmplare: lunile proaste vin cu toți boții deodată.",
      "Obiceiurile: lista e fixată dinainte. Dovedit = intervalul de 99% al diferenței (2.000 de reluări pe monede / acțiuni) nu conține zero și diferența are același semn în ambele jumătăți de timp. Altfel nedovedit, adică poate fi întâmplare (nu „fără efect”).",
      "Acțiunile: o poziție = de la prima cumpărare până la zero; rezultatul real în lei, cu comisioanele de conversie scăzute.",
      "„La limită” = semnul trece de pragul obișnuit (95%), dar nu de cel strict (99%): e un semn de urmărit, nu încă o dovadă. Pragul strict vine din probă: pe rezultate amestecate la întâmplare, cel obișnuit găsea „dovezi” false prea des.",
      "Boții și pozițiile încă deschise nu intră în socoteli (rezultatul lor nu e încă știut)."].map(function (t) { return "<li>" + rlEsc(t) + "</li>"; }).join("") + "</ul></details>";
  return h;
}
function rlDeseneaza() { var el = typeof document !== "undefined" && document.getElementById("rlPagina"); if (!el || (el.closest && el.closest(".panel") && !el.closest(".panel").classList.contains("on") && rlStare.raport)) return; el.innerHTML = rlStare.eroare && !rlStare.raport ? '<p class="tbSub">' + rlEsc(rlStare.eroare) + "</p>" : rlHtml(rlStare.raport, rlStare); }
function rlAlegeK(tip, K) { if (tip === "boti") rlStare.kBoti = Number(K); else rlStare.kAct = Number(K); rlDeseneaza(); }
async function rlPorneste(fortat) {
  rlDeseneaza();
  // încercarea se notează ÎNAINTE de cerere: fără raport (sau cu cererea picată) se reîncearcă cel mult o dată pe minut - cartela din Tablou
  // cere raportul când lipsește, iar raportul redesenează cartela (altfel: buclă de cereri, prinsă de garda ecranului)
  if (rlStare.inLucru || (!fortat && Date.now() - rlStare.la < (rlStare.raport ? 10 * 60000 : 60000))) return;
  rlStare.inLucru = true; rlStare.la = Date.now();
  try { var d = await getJSON("/api/istoric-bot?action=risc"); rlStare.raport = d && d.risc || null; rlStare.eroare = null; }
  catch (e) { rlStare.eroare = "N-am putut citi raportul: " + (typeof textEroare === "function" ? textEroare(e) : String(e && e.message || e)); }
  finally { rlStare.inLucru = false; }
  rlDeseneaza();
  if (typeof tbRiscDeseneaza === "function") tbRiscDeseneaza();
  if (typeof t212GraficeDeseneaza === "function" && typeof document !== "undefined" && document.getElementById("t212") && document.getElementById("t212").classList.contains("on")) { try { t212GraficeDeseneaza(); } catch (e) {} }   // rândul riscului din detaliul pozițiilor T212 (doar cu pagina deschisă)
}
