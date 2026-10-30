// v100.272 (ideile auditului 29.10, felia 4): corpul unei cereri citit CU PLAFON. Înainte rutele citeau tot corpul (request.text() / json())
// și abia apoi îl măsurau (istoric-bot, t212), iar push / history nu aveau deloc plafon - un corp de sute de MB intra întreg în memorie.
// `max` e în semne, ca `text.length` de până acum; un semn are cel mult 3 octeți în UTF-8 ⇒ Content-Length peste 3 × max e respins fără
// citire, iar fluxul se oprește când trece de 3 × max octeți. Nimic din ce trecea înainte nu e respins acum (după citire, tot `text.length > max`).
//   citesteCorp(request, max) -> { text } sau { prea: true } (⇒ 413)
export async function citesteCorp(request, max) {
  const lim = max * 3, cl = Number(request.headers.get("content-length"));
  if (Number.isFinite(cl) && cl > lim) return { prea: true };
  if (!request.body) { const t = await request.text(); return t.length > max ? { prea: true } : { text: t }; }
  const rd = request.body.getReader(), bucati = [];
  let n = 0;
  for (;;) {
    const { done, value } = await rd.read();
    if (done) break;
    n += value.byteLength;
    if (n > lim) { try { await rd.cancel(); } catch {} return { prea: true }; }
    bucati.push(value);
  }
  const tot = new Uint8Array(n);
  let o = 0;
  for (const b of bucati) { tot.set(b, o); o += b.byteLength; }
  const text = new TextDecoder().decode(tot);
  return text.length > max ? { prea: true } : { text };
}
