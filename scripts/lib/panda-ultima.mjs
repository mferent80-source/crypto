// v100.258: două gărzi cereau fiecare „ULTIMA linie din app.css”: pânda (v100.150, bate .t212Tab thead) și #topLive{display:none!important}
// (v100.224, gărzile v100.232–v100.253). Se împacă: pânda stă după orice regulă de tabel, chiar înaintea blocului v100.224, care rămâne ultimul.
// Blocul v100.224 ascunde .topLeft / #wsStatus / #topLive pe paginile de zi și nu atinge nicio regulă de tabel.
export function pandaInainteaCozii(css) {
  const t = String(css).replace(/\r\n/g, "\n").trim();
  const iP = t.lastIndexOf("@media (max-width:640px){.sugPandaTab thead{display:table-header-group}");
  if (iP < 0) return "lipsește regula pândei";
  const dupa = t.slice(t.indexOf("\n", iP) + 1).trim();
  if (!dupa.startsWith("/* v100.224")) return "după pândă nu vine blocul v100.224: " + dupa.slice(0, 80);
  if (!/#topLive\{display:none!important\}$/.test(dupa)) return "blocul v100.224 nu mai e ultimul";
  if (/thead|display:table|\.t212Tab|sugPanda/.test(dupa)) return "după pândă a apărut o regulă de tabel";
  return "";
}
