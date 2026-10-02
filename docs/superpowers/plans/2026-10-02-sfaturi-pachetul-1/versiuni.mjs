// Sarcina 6: versiunea paginii v100.61 (5 fisiere, 8 locuri) si a colectorului v101.41 (abatere de la spec: colectorul se schimba
// deja la pachetul 1, pentru ca incarca text-ro.js). Fiecare lista se aplica cu: node ed.mjs <fisier> versiuni.mjs <lista>
export const build = [
  [`"version": "v100.60",`, `"version": "v100.61",`],
  [`"badge": "v100.60 · LICHIDAREA CU DIRECȚIE + LIMITA COLECTORULUI",`, `"badge": "v100.61 · SFATURILE CONCISE: CONSILIERUL BOȚILOR",`],
];
export const versiune = [[`export const VERSIUNE = "v100.60";`, `export const VERSIUNE = "v100.61";`]];
export const pkg = [[`"version": "100.60.0",`, `"version": "100.61.0",`]];
export const sw = [[`const CACHE="crypto-radar-v100-60";`, `const CACHE="crypto-radar-v100-61";`]];
export const html = [
  [`content="v100.60" name="app-version"`, `content="v100.61" name="app-version"`],
  [`>v100.60 · LICHIDAREA CU DIRECȚIE + LIMITA COLECTORULUI</div>`, `>v100.61 · SFATURILE CONCISE: CONSILIERUL BOȚILOR</div>`],
  [`>v100.60 · CRYPTO RADAR · PIONEX + TRADING 212 DOAR CITIRE</span>`, `>v100.61 · CRYPTO RADAR · PIONEX + TRADING 212 DOAR CITIRE</span>`],
  [`<b id="healthAppVersion">v100.60</b>`, `<b id="healthAppVersion">v100.61</b>`],
];
export const colector = [[`const VERSIUNE_COLECTOR = "v101.40";`, `const VERSIUNE_COLECTOR = "v101.41";`]];
// sarcina 6, pasul 5: proba de ecran face si o poza a Tabloului la 1920 (Consilierul + cartelele, la latimea LUI)
export const ecran = [[`"lipseste #" + id);`, `"lipseste #" + id);
      await b.ev(\`document.getElementById("tbSemaforCard").scrollIntoView()\`); await b.poza(path.join(DOSAR_POZE, "tablou-lat.png"));   /* v100.61: Tabloul la latimea LUI */`]];
