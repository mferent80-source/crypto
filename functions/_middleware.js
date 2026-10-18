// v100.196 (auditul sever, 🔵12): `public/_headers` nu se aplică răspunsurilor din Functions ⇒ /api/* n-aveau X-Content-Type-Options.
// Toate sunt JSON cu content-type corect (risc mic), dar antetul se pune aici o singură dată pentru toate rutele.
// WebSocket-ul (101, releul prețului live) trece neatins; un răspuns cu antete nemodificabile se copiază.
export async function onRequest(context) {
  // v100.209: proba de ecran trimite `x-proba-ecran: 1` ⇒ Pionex nu e chemat. v100.214: NU mai aprinde aici un steag comun (bloca
  // și cererile colectorului venite în același timp); fiecare rută Pionex face env=cuProba(env,request) — vezi _shared/pionex.js.
  const r = await context.next();
  if (!r || r.status === 101 || r.webSocket) return r;
  try { if (!r.headers.get("x-content-type-options")) r.headers.set("x-content-type-options", "nosniff"); return r; }
  catch {
    const h = new Headers(); try { for (const [k, v] of r.headers) h.set(k, v); } catch {}
    h.set("x-content-type-options", "nosniff");
    return new Response(r.body, { status: r.status, statusText: r.statusText, headers: h });
  }
}
