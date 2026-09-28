import {sameOrigin} from "../_shared/auth.js";

// v100.6 (el, 28.09: „nicăieri nu se arată prețul live al botului”) - releu pentru prețul LIVE al botului.
// WebSocket-ul public Pionex (wss://ws.pionex.com/wsPub) refuza cu 403 ORICE conexiune care are antet Origin
// (masurat: 127.0.0.1, localhost, crypto-wuy.pages.dev, chiar www.pionex.com) - iar browserul il trimite mereu.
// Serverul se leaga fara Origin, raspunde el la PING si trimite paginii DOAR tranzactiile simbolului cerut.
// Date publice (pretul pietei), nimic din cont: fara parola, dar doar din pagina noastra (acelasi Origin)
// si doar pe simboluri Pionex valide. Pagina: pvPorneste() in app.js; mesajele le citeste PretViu.mesaj().

const dec=new TextDecoder();
const SIMBOL=/^[A-Z0-9]{1,20}_USDT(?:_PERP)?$/;
const H={"content-type":"application/json","cache-control":"no-store"};
const json=(x,status)=>new Response(JSON.stringify(x),{status,headers:H});

export async function onRequestGet({request}){
  if((request.headers.get("upgrade")||"").toLowerCase()!=="websocket")return json({error:"WEBSOCKET_REQUIRED"},426);
  if(!sameOrigin(request))return json({error:"ORIGIN_REFUSED"},403);
  const simbol=String(new URL(request.url).searchParams.get("simbol")||"").toUpperCase();
  if(!SIMBOL.test(simbol))return json({error:"SIMBOL_INVALID"},400);

  let sus;
  try{
    const r=await fetch("https://ws.pionex.com/wsPub",{headers:{Upgrade:"websocket"}});
    sus=r.webSocket;
    if(!sus)return json({error:"PIONEX_WS_REFUZ",status:r.status},502);
  }catch(e){return json({error:"PIONEX_WS_INDISPONIBIL"},502)}
  sus.accept();

  const pereche=new WebSocketPair(),client=pereche[0],server=pereche[1];
  server.accept();
  const inchide=()=>{try{sus.close(1000,"gata")}catch(e){}try{server.close(1000,"gata")}catch(e){}};

  sus.addEventListener("message",ev=>{
    // Pionex trimite JSON-ul in cadre BINARE (masurat) - fara decodare, nici PING-ul n-ar primi PONG si Pionex ar inchide.
    const text=typeof ev.data==="string"?ev.data:dec.decode(ev.data);
    let m;try{m=JSON.parse(text)}catch(e){return}
    if(m&&m.op==="PING"){try{sus.send(JSON.stringify({op:"PONG",timestamp:Date.now()}))}catch(e){}return}
    if(m&&m.topic==="TRADE"&&m.symbol===simbol){try{server.send(text)}catch(e){inchide()}}
  });
  sus.addEventListener("close",inchide);
  sus.addEventListener("error",inchide);
  server.addEventListener("close",inchide);
  server.addEventListener("error",inchide);
  sus.send(JSON.stringify({op:"SUBSCRIBE",topic:"TRADE",symbol:simbol}));

  return new Response(null,{status:101,webSocket:client});
}
