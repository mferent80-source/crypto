// Orice /api/* fara ruta. Fara fisierul asta, Cloudflare Pages intorcea index.html
// cu HTTP 200, JSON.parse crapa in frontend si eroarea nu spunea nimic.
// Rutele adevarate (bot-orders.js, market.js ...) sunt mai specifice si au prioritate.
export function onRequest(){
  return new Response(JSON.stringify({error:"NO_ROUTE"}),{status:404,headers:{"content-type":"application/json","cache-control":"no-store"}});
}
