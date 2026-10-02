# Anexa planului „Sfaturile concise — pachetul 1”

Codul exact al planului `../2026-10-02-sfaturi-pachetul-1-consilier-boti.md`, validat pe o copie a repo-ului (sarcinile 1–6: fiecare probă nouă pică întâi, apoi trece, iar `npm test` e verde după fiecare sarcină).

| Fișier | Ce e | Unde ajunge |
|---|---|---|
| `ed.mjs` | editorul: `node ed.mjs <fișier> <înlocuiri.mjs> [listă]` — fiecare „vechi” trebuie să apară exact o dată (altfel nu scrie nimic), păstrează CRLF-ul | — (unealtă) |
| `text-ro.js` | modulul `TextRo` (cifrele textelor) | `public/lib/text-ro.js` |
| `text-ro-global.mjs` | `TextRo` ca global pentru probele din Node | `scripts/lib/text-ro-global.mjs` |
| `s1-importuri.mjs` | pune `import "./lib/text-ro-global.mjs";` în probele care evaluează `semnale-bot.js` / `consiliu.js` | 18 probe |
| `garda-texte.mjs` | garda textelor (`STRICT` gol; sarcinile 3–5 îl completează) | `scripts/garda-texte.mjs` |
| `proba-v10061.mjs` + `sectiuni.mjs` | proba pachetului, pe secțiuni „sarcina N”; `node sectiuni.mjs N <dest>` scrie secțiunile ≤ N | `scripts/proba-v10061.mjs` |
| `s3-semafor.mjs` | 18 înlocuiri în `semnale-bot.js` (semaforul) | `public/lib/semnale-bot.js` |
| `s4-cartele.mjs` | 15 înlocuiri în `semnale-bot.js` (cartelele, rândul de bani) | `public/lib/semnale-bot.js` |
| `s5-consiliu.mjs` | 15 înlocuiri în `consiliu.js` | `public/lib/consiliu.js` |
| `pagina.mjs` | listele `s1_html`, `s1_sw`, `s1_colector`, `s2_pkg`, `s4_app`, `s4_css`, `s5_app`, `s5_css` | pagina, cache-ul, colectorul, `package.json` |
| `teste-vechi.mjs` | probele vechi aduse la textul nou: `s3_*`, `s4_*`, `s5_*` (același fapt, altă formulare; fiecare cu un comentariu) | 10 probe |
| `versiuni.mjs` | v100.61 / colectorul v101.41 + poza Tabloului la 1920 în proba de ecran (`ecran`) | 7 fișiere |
