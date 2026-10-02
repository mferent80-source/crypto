# Anexa planului „Sfaturile concise — pachetul 2”

Codul exact al planului `../2026-10-02-sfaturi-pachetul-2-sfaturile-botilor.md`, validat pe o copie curată a repo-ului (sarcinile 1–6: fiecare secțiune nouă a probei pică întâi, apoi trece, iar `npm test` e verde după fiecare sarcină).

| Fișier | Ce e | Unde ajunge |
|---|---|---|
| `ed.mjs` | editorul (același ca la pachetul 1): `node ed.mjs <fișier> <înlocuiri.mjs> [listă]` — fiecare „vechi” trebuie să apară exact o dată, altfel nu scrie nimic; păstrează CRLF-ul | — (unealtă) |
| `proba-v10062.mjs` + `sectiuni.mjs` | proba pachetului, pe secțiuni „sarcina N”; `node sectiuni.mjs N <dest>` scrie secțiunile ≤ N | `scripts/proba-v10062.mjs` |
| `avertismente-v1.js` | avertismentele serverului mutate NESCHIMBATE într-o funcție pură | `functions/_shared/avertismente.js` (sarcina 1) |
| `s1-bot-orders.mjs` (+ `bot-orders-bloc-vechi.txt`, `bot-orders-ban-semn.txt`) | `bot-orders.js` folosește funcția nouă | `functions/api/bot-orders.js` |
| `s1-garda.mjs` | garda primește pachetul 2 (sfaturile reale, „Ce ai de făcut acum”, Consilierul cu sfaturi reale, serverul), `--mod=` la inventar | `scripts/garda-texte.mjs` |
| `inventar-inainte-anexa.md` | ce nu generează garda: verdictul vechi din `tablou-bot.js` (ideea 3), textele Tabloului din `app.js`, ce nu e în pachet | coada inventarului „înainte” |
| `s2-sfaturi.mjs` | 17 înlocuiri în `sfaturi.js` | `public/lib/sfaturi.js` |
| `s2-directie.mjs` | rezumatul direcției: o frază, fără majuscule, + `dovezi` | `public/lib/directie.js` |
| `s3-consiliu.mjs` | `titluMargine` iese, verdictul vechi cu „de ce”-ul lui, legenda | `public/lib/consiliu.js` |
| `s5-server.mjs` (+ `avertismente-bloc-nou.txt`) | textele noi ale avertismentelor | `functions/_shared/avertismente.js` |
| `pagina.mjs` | listele `s1_pkg`, `s2_app`, `s2_garda`, `s3_garda`, `s4_app`, `s4_css`, `s4_extra`, `s4_garda`, `s5_garda` | `package.json`, `app.js`, `app.css`, `tablou-extra.js`, garda |
| `teste-vechi.mjs` | probele vechi aduse la textul nou (același fapt, altă formulare; fiecare cu un comentariu `/* … */`) | 7 probe |
| `versiuni.mjs` | v100.62 / colectorul v101.42 | 6 fișiere |
| `inventar-dupa-harta.md` | capul inventarului „după”: harta informațiilor | `docs/superpowers/inventar-sfaturi/2-sfaturi-boti-dupa.md` |
| `poza-todo.mjs` | poza „Ce ai de făcut acum” + Consilierul pe pagina locală (:8788), la lățimile date, cu datele lui reale (tokenul din `.dev.vars`, netipărit); scrie și textul listelor | — (unealtă, sarcina 6) |
