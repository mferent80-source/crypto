// Sarcina 6: versiunea paginii v100.62 (5 fisiere, 8 locuri) si a colectorului v101.42 (colectorul incarca sfaturi.js, consiliu.js si
// directie.js - fara repornire ar trimite pe Discord textele vechi). Fiecare lista: node ed.mjs <fisier> versiuni.mjs <lista>
export const build = [
  [`"version": "v100.61",`, `"version": "v100.62",`],
  [`"badge": "v100.61 · SFATURILE CONCISE: CONSILIERUL BOȚILOR",`, `"badge": "v100.62 · SFATURILE CONCISE: SFATURILE BOȚILOR",`],
];
export const versiune = [[`export const VERSIUNE = "v100.61";`, `export const VERSIUNE = "v100.62";`]];
export const pkg = [[`"version": "100.61.0",`, `"version": "100.62.0",`]];
export const sw = [[`const CACHE="crypto-radar-v100-61";`, `const CACHE="crypto-radar-v100-62";`]];
export const html = [
  [`content="v100.61" name="app-version"`, `content="v100.62" name="app-version"`],
  [`>v100.61 · SFATURILE CONCISE: CONSILIERUL BOȚILOR<`, `>v100.62 · SFATURILE CONCISE: SFATURILE BOȚILOR<`],
  [`>v100.61 · CRYPTO RADAR · PIONEX + TRADING 212 DOAR CITIRE<`, `>v100.62 · CRYPTO RADAR · PIONEX + TRADING 212 DOAR CITIRE<`],
  [`<b id="healthAppVersion">v100.61</b>`, `<b id="healthAppVersion">v100.62</b>`],
];
export const colector = [[`const VERSIUNE_COLECTOR = "v101.41";`, `const VERSIUNE_COLECTOR = "v101.42";`]];
