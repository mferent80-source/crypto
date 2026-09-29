// v101.6: adresa FIXA a Radarului prin Tailscale. `tailscale serve --https=<port> http://127.0.0.1:8788`
// da o adresa care nu se schimba la pornire (tunelul trycloudflare se schimba). Adresa se citeste din
// `tailscale serve status --json`, nu se scrie in cod: depozitul e public.
export function adresaTailscale(serve, bazaLocala) {
  let port = "";
  try { port = new URL(String(bazaLocala || "")).port; } catch { return null; }
  if (!port || !serve || typeof serve !== "object" || !serve.Web || typeof serve.Web !== "object") return null;
  const tinta = new RegExp("^https?://(127\\.0\\.0\\.1|localhost):" + port + "/?$");
  for (const [gazda, cfg] of Object.entries(serve.Web)) {
    const h = cfg && cfg.Handlers && cfg.Handlers["/"];
    if (!h || !tinta.test(String(h.Proxy || ""))) continue;
    if (!/^[a-z0-9.-]+\.ts\.net(:\d+)?$/i.test(gazda)) continue;
    return "https://" + gazda.replace(/:443$/, "");
  }
  return null;
}
