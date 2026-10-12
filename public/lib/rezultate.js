// rezultate.js — pagina „Rezultate” a Radarului (global Rezultate, pur: pagină + probe în vm).
// 11.10.2026, direcția lui Marius „o aplicație și atât”: pagina earnings-hub din premarket_scanner se mută în Radar cu logica
// ei — calendarul raportărilor pe TOATĂ piața (Finnhub, doar SUA), 7 / 14 / 30 de zile, ⭐ + „doar ⭐”, la clic reacția prețului
// după raportările trecute — în designul nou. Diferențe voite: cheia Finnhub stă pe serverul Radarului de acasă (KV), nu în
// browser; ⭐ se pune singură pe ce deține (T212, Salt) și ce urmărește; fără anunț (colectorul îl trimite pe Discord), fără AI.
(function (global) {
  "use strict";
  const ZILE = ["duminică", "luni", "marți", "miercuri", "joi", "vineri", "sâmbătă"];
  const ZI = 86400000;
  const nr = (x) => (typeof x === "number" && isFinite(x) ? x : null);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const cate = (n, sg, pl) => { const k = Math.round(n), r = Math.abs(k) % 100; return k === 1 ? "1 " + sg : k + (k !== 0 && (r === 0 || r >= 20) ? " de " : " ") + pl; };
  // o zecimală, minus tipografic, jumătatea după valoarea absolută
  const z1 = (x) => { x = nr(x); if (x === null) return "—"; const r = Math.round(Math.abs(x) * 10 + 1e-9) / 10; return (x < 0 && r > 0 ? "−" : "") + r.toFixed(1).replace(".", ","); };
  const z2 = (x) => { x = nr(x); if (x === null) return "—"; const r = Math.round(Math.abs(x) * 100 + 1e-9) / 100; return (x < 0 && r > 0 ? "−" : "") + r.toFixed(2).replace(".", ","); };
  const pctSemn = (x) => { x = nr(x); if (x === null) return "nu știu"; const t = z1(x); return (x > 0 && t !== "0,0" ? "+" : "") + t + "%"; };
  const clsSemn = (x) => (nr(x) === null ? "" : x > 0 ? " bun" : x < 0 ? " rau" : "");
  const SIM_OK = /^[A-Z0-9][A-Z0-9.\-]{0,11}$/;

  function oraRo(h) { return h === "bmo" ? "înainte de deschidere" : h === "amc" ? "după închidere" : h === "dmh" ? "în timpul ședinței" : "—"; }
  function simbolDin(t) { return String(t || "").toUpperCase().replace(/_.*$/, "").trim(); }
  function ziua(data) { const t = Date.parse(data + "T12:00:00Z"); if (!isFinite(t)) return String(data || "—"); const d = new Date(t); return ZILE[d.getUTCDay()] + ", " + String(d.getUTCDate()).padStart(2, "0") + "." + String(d.getUTCMonth() + 1).padStart(2, "0"); }
  function dataLunga(data) { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(data || "")); return m ? m[3] + "." + m[2] + "." + m[1] : String(data || "—"); }
  const rangStea = (s) => (s === "detii" ? 0 : s === "urmaresti" ? 1 : 2);

  function grupeaza(items, stele, o) {
    stele = stele || {}; const doar = !!(o && o.doarStea);
    const randuri = (Array.isArray(items) ? items : []).map((x) => ({ s: String(x.s || ""), data: String(x.data || ""), ora: x.ora || "", epsEst: nr(x.epsEst), epsAct: nr(x.epsAct), venitEst: nr(x.venitEst), stea: stele[String(x.s || "")] || null }))
      .filter((r) => r.s && r.data && (!doar || r.stea));
    const pe = {};
    for (const r of randuri) (pe[r.data] = pe[r.data] || []).push(r);
    return Object.keys(pe).sort().map((d) => ({
      data: d, ziua: ziua(d),
      randuri: pe[d].sort((a, b) => rangStea(a.stea) - rangStea(b.stea) || (b.venitEst || 0) - (a.venitEst || 0) || a.s.localeCompare(b.s)),
    }));
  }

  function htmlCheie(st) {
    return '<div class="rzCheieBox"><p class="tbSub">Calendarul pe toată piața vine de la Finnhub și cere cheia ta Finnhub. O lipești o singură dată aici; se ține pe serverul Radarului de acasă (nu în browser), deci merge și de pe telefon.</p>' +
      '<div class="rzCheieRand"><input id="rzCheie" type="password" autocomplete="off" spellcheck="false" placeholder="cheia Finnhub" aria-label="Cheia Finnhub"><button type="button" class="t212BtnLinie" data-action-click="rzSalveazaCheie()">Salvează cheia</button></div>' +
      (st && st.mesajCheie ? '<p class="tbSub rzMesaj">' + esc(st.mesajCheie) + "</p>" : "") + "</div>";
  }

  function htmlIstoric(ist) {
    if (!ist) return '<p class="tbSub">Aduc raportările trecute…</p>';
    if (ist.eroare) return '<p class="tbSub rzEroare">Raportările trecute: ' + esc(ist.eroare) + "</p>";
    const l = Array.isArray(ist.items) ? ist.items : [];
    if (!l.length) return '<p class="tbSub">' + esc(ist.s || "") + ": n-am găsit raportări trecute (Nasdaq dă ultimele 4).</p>";
    const notaPret = ist.eroarePret ? '<p class="tbSub rzEroare">' + esc(ist.eroarePret) + "</p>" : "";
    const val = l.filter((x) => nr(x.reactie) !== null), medie = val.length ? val.reduce((a, x) => a + Math.abs(x.reactie), 0) / val.length : null, sus = val.filter((x) => x.reactie > 0).length;
    const rand = (x) => "<tr><td>" + esc(dataLunga(x.data)) + "</td><td>" + esc(oraRo(x.ora) + (x.oraDedusa ? " · după preț" : x.oraObicei ? " · după obiceiul firmei" : "")) + '</td><td class="num' + clsSemn(x.reactie) + '">' + pctSemn(x.reactie) + '</td><td class="num' + clsSemn(x.reactie5) + '">' + pctSemn(x.reactie5) + '</td><td class="num' + clsSemn(x.surpriza) + '">' + (nr(x.surpriza) === null ? "—" : pctSemn(x.surpriza)) + "</td></tr>";
    return '<div class="rzIst"><b>' + esc(ist.s || "") + " — cum a reacționat prețul după raportările trecute</b>" + notaPret +
      '<table class="t212Tab rzIstTab"><thead><tr><th>Raportarea</th><th>Momentul</th><th class="num">Ziua de după</th><th class="num">5 zile</th><th class="num">EPS față de estimare</th></tr></thead><tbody>' + l.map(rand).join("") + "</tbody></table>" +
      (medie === null ? "" : '<p class="tbSub">Mișcarea medie după raport: ' + z1(medie) + "% (în orice direcție) · " + sus + " din " + val.length + " în sus. Răspunde la „merită să stau peste raportare?”, nu e un semnal.</p>") + "</div>";
  }

  function htmlPagina(st) {
    st = st || {};
    if (!st.cheie) return '<div class="tbBloc rzBloc">' + htmlCheie(st) + "</div>";
    const zile = [7, 14, 30].indexOf(st.zile) >= 0 ? st.zile : 7, doar = !!st.doarStea, stele = st.stele || {};
    const items = st.cal && Array.isArray(st.cal.items) ? st.cal.items : [];
    const nStele = items.filter((x) => stele[x.s]).length;
    const btn = (act, apasat, text) => '<button type="button" class="t212BtnLinie" data-action-click="' + act + '" aria-pressed="' + (apasat ? "true" : "false") + '">' + text + "</button>";
    let h = '<div class="tbBloc rzBloc"><div class="tbBlocCap rzCap"><b>Cine raportează</b><span class="tbSub">cheia Finnhub: pusă · <button type="button" class="rzLink" data-action-click="rzArataCheie()">schimbă</button></span></div>' +
      (st.arataCheie ? htmlCheie(st) : "") +
      '<div class="rzFiltre" role="group" aria-label="Fereastra">' + btn("rzZile(7)", zile === 7, "7 zile") + btn("rzZile(14)", zile === 14, "14 zile") + btn("rzZile(30)", zile === 30, "30 de zile") +
      '<span class="rzSep"></span>' + btn("rzToate()", !doar, "toate") + btn("rzDoarStea()", doar, "doar ⭐ (" + nStele + ")") + "</div>" +
      '<p class="tbSub">⭐ = ce deții (T212, Salt) și ce urmărești, puse singure. Toată piața din SUA, de la Finnhub. „Mâine raportează” îți vine pe Discord de la colector.</p>';
    if (!st.cal) return h + '<p class="tbSub">Aduc calendarul…</p></div>';
    if (st.cal.eroare) return h + '<p class="tbSub rzEroare">' + esc(st.cal.eroare) + '</p><button type="button" class="t212BtnLinie" data-action-click="rzReincarca()">Încearcă din nou</button></div>';
    const g = grupeaza(items, stele, { doarStea: doar });
    if (!g.length) return h + '<p class="tbSub">' + (doar ? "Niciuna dintre companiile tale nu raportează în următoarele " + cate(zile, "zi", "zile") + "." : "Nicio raportare în următoarele " + cate(zile, "zi", "zile") + ".") + "</p></div>";
    h += '<div class="rzTabel"><table class="t212Tab rzTab"><thead><tr><th>Compania</th><th>Momentul</th><th class="num">EPS estimat</th><th class="num">Venit estimat</th><th></th></tr></thead><tbody>';
    for (const z of g) {
      h += '<tr class="rzZi"><td colspan="5"><b>' + esc(z.ziua) + '</b> <span class="tbSub">· ' + cate(z.randuri.length, "companie", "companii") + "</span></td></tr>";
      for (const r of z.randuri) {
        const act = SIM_OK.test(r.s) ? ' tabindex="0" data-action-click="rzDesfa(\'' + r.s + '\')" aria-expanded="' + (st.deschis === r.s ? "true" : "false") + '"' : "";
        const et = r.stea === "detii" ? ' <span class="rzEt">deții</span>' : r.stea === "urmaresti" ? ' <span class="rzEt">urmărești</span>' : "";
        const venit = nr(r.venitEst) === null ? "—" : z1(r.venitEst / 1e9) + " mld $";
        h += '<tr class="rzRand' + (r.stea ? " rzStea" : "") + '"' + act + '><td class="rzNume">' + (r.stea ? "⭐ " : "") + "<b>" + esc(r.s) + "</b>" + et + '</td><td class="rzOra">' + esc(oraRo(r.ora)) + '</td><td class="num rzEps">' + z2(r.epsEst) + '</td><td class="num rzVenit">' + venit + '</td><td class="rzChev">' + (act ? "›" : "") + "</td></tr>";
        if (st.deschis === r.s) h += '<tr class="rzDet"><td colspan="5">' + htmlIstoric(st.istoric && st.istoric[r.s]) + "</td></tr>";
      }
    }
    return h + "</tbody></table></div>" + (st.cal.la ? '<p class="tbSub">adus la ' + new Date(st.cal.la).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" }) + " · se reîmprospătează o dată pe oră</p>" : "") + "</div>";
  }

  // rândul scurt din pagina de acțiuni: ce raportează în următoarele 7 zile din ce deții / urmărești
  function randStocks(cal, stele, acum) {
    if (!cal || !Array.isArray(cal.items) || !stele) return null;
    const azi = new Date(acum).toISOString().slice(0, 10), pana = new Date(acum + 7 * ZI).toISOString().slice(0, 10);
    const l = cal.items.filter((x) => stele[x.s] && x.data >= azi && x.data <= pana).sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0));
    if (!l.length) return null;
    return '<div class="t212Link rzRand7">📅 Raportează în 7 zile (din ce deții / urmărești): <b>' + l.map((x) => esc(x.s) + " " + ziua(x.data).split(",")[0]).join(", ") + '</b> <button type="button" class="t212BtnLinie" data-action-click="navTo(\'rezultate\',true)">Rezultate ›</button></div>';
  }

  global.Rezultate = { oraRo, simbolDin, ziua, grupeaza, htmlPagina, htmlIstoric, randStocks };
})(typeof window !== "undefined" ? window : globalThis);
