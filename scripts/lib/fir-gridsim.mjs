// v100.356 (I-892, 17.11: pe VPS „bucla a stat blocată” de 34 de ori într-o zi, 5,8–19 s, de fiecare dată la tura Monte Carlo, cu UN bot): calculul
// greu al turei (GridSim.simuleaza pe 2.000 de drumuri, GridSim.hotarare pe 800, regimul) pe un fir separat (worker_threads). Bucla colectorului
// (alertele de stop / lichidare, poza, cererile în zbor) nu mai stă după el. Același motor, aceleași cifre (proba-v100356 F1).
//   • firul căzut / ieșit / nepornit ⇒ calculul acelei cereri se face PE LOC, ca înainte (o linie în jurnal) - tura nu pierde nimic;
//   • după maxCaderi căderi, firul nu se mai pornește (totul pe loc, ca până la v100.355);
//   • firul care nu răspunde în timeoutMs e oprit, iar cererea pică cu „nu a răspuns” (nu se reia pe loc: același calcul ar bloca bucla); nu se numără
//     drept cădere (revizia 🟡4), iar căderile se uită după 6 h fără niciuna.
import { Worker } from "node:worker_threads";

export function firGridSim({ RAD, GridSim, jurnal, timeoutMs = 180000, maxCaderi = 3, fisier } = {}) {
  let w = null, gata = null, nr = 0, caderi = 0, spusPeLoc = false, ultimaCadere = 0;   // revizia (🟡4): căderile se uită după 6 h fără niciuna
  const cade = () => { caderi++; ultimaCadere = Date.now(); };
  const asteapta = new Map();
  const log = (...a) => { try { if (jurnal) jurnal(...a); } catch { /* jurnalul nu oprește calculul */ } };
  function peLoc(fn, args, motiv) {
    if (!spusPeLoc) { spusPeLoc = true; log("calculul Monte Carlo se face pe loc (" + motiv + ")"); }
    return GridSim[fn](...args);
  }
  function inchide(motiv) {
    const x = w; w = null; gata = null;
    const l = [...asteapta.values()]; asteapta.clear();
    for (const p of l) { clearTimeout(p.ceas); p.cadere(motiv); }
    if (x) x.terminate().catch(() => {});
  }
  function porneste() {
    const x = new Worker(fisier || new URL("./fir-gridsim-lucru.mjs", import.meta.url), { workerData: { RAD } });
    x.unref(); w = x;
    gata = new Promise((rez, rej) => {
      x.once("message", (m) => (m && m.gata ? rez() : rej(new Error("firul n-a pornit"))));
      x.once("error", rej); x.once("exit", (c) => rej(new Error("firul a ieșit la pornire (cod " + c + ")")));
    });
    gata.catch(() => {});
    x.on("message", (m) => {
      if (!m || m.gata) return; const p = asteapta.get(m.id); if (!p) return;
      asteapta.delete(m.id); clearTimeout(p.ceas);
      if (m.eroare != null) p.rej(new Error(m.eroare)); else p.rez(m.r);
    });
    x.on("error", (e) => { if (w !== x) return; cade(); log("firul de calcul a căzut:", e && e.message || e); inchide("firul a căzut"); });
    x.on("exit", (c) => { if (w !== x) return; cade(); log("firul de calcul a ieșit, cod", c); inchide("firul a ieșit"); });
  }
  async function cheama(fn, args) {
    if (caderi >= maxCaderi && Date.now() - ultimaCadere > 6 * 3600000) { caderi = 0; spusPeLoc = false; }
    if (caderi >= maxCaderi) return peLoc(fn, args, "firul a căzut de " + caderi + " ori");
    try { if (!w) porneste(); await gata; }
    catch (e) { if (w) { cade(); inchide("pornire"); } return peLoc(fn, args, "firul n-a pornit: " + (e && e.message || e)); }
    const id = ++nr, x = w;
    return new Promise((rez, rej) => {
      const ceas = setTimeout(() => {
        if (!asteapta.has(id)) return;
        log("firul de calcul n-a răspuns în " + Math.round(timeoutMs / 1000) + " s (" + fn + ") - îl opresc");
        const p = asteapta.get(id); asteapta.delete(id); p.rej(new Error("calculul pe fir n-a răspuns în " + Math.round(timeoutMs / 1000) + " s"));
        if (w === x) inchide("firul n-a răspuns");
      }, timeoutMs);
      asteapta.set(id, { rez, rej, ceas, cadere: (motiv) => { try { rez(peLoc(fn, args, motiv)); } catch (e) { rej(e); } } });
      try { x.postMessage({ id, fn, args }); }
      catch (e) { asteapta.delete(id); clearTimeout(ceas); try { rez(peLoc(fn, args, "mesajul n-a plecat: " + (e && e.message || e))); } catch (e2) { rej(e2); } }
    });
  }
  return {
    simuleaza: (...a) => cheama("simuleaza", a),
    hotarare: (...a) => cheama("hotarare", a),
    opreste: () => inchide("oprit"),
    stare: () => ({ pornit: !!w, caderi, inLucru: asteapta.size }),
  };
}
