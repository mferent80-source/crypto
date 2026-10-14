import {sameOrigin,requireApiAuth,authErrorResponse} from "../_shared/auth.js";
// v100.175 (auditul Opus, M14): Origin-ul îl poate pune orice client care nu e browser ⇒ releul cere un BILET și ține cel mult 8 conexiuni.
// v100.176 (revizia de securitate a commitului): parola nu mai intră în adresă (adresele ajung în jurnale) - pagina cere cu POST (parola în
// antet) un bilet = „expiră.semnătură”, HMAC-SHA256 cu parola peste simbol + expirare, valabil 60 s, doar pentru simbolul acela; fără stare
const enc=new TextEncoder();
async function semneaza(cheie,text){const k=await crypto.subtle.importKey("raw",enc.encode(String(cheie)),{name:"HMAC",hash:"SHA-256"},false,["sign"]);return [...new Uint8Array(await crypto.subtle.sign("HMAC",k,enc.encode(text)))].map(b=>b.toString(16).padStart(2,"0")).join("")}
function egalText(a,b){a=String(a||"");b=String(b||"");let d=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)d|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return d===0}
export async function biletPentru(cheie,simbol,acum){const exp=Math.floor(acum/1000)+60;return exp+"."+await semneaza(cheie,"pret-viu:"+simbol+":"+exp)}
export async function biletBun(cheie,simbol,bilet,acum){const m=/^(\d{10})\.([0-9a-f]{64})$/.exec(String(bilet||""));if(!cheie||!m)return false;const exp=Number(m[1]),t=Math.floor(acum/1000);if(exp<t||exp>t+120)return false;return egalText(m[2],await semneaza(cheie,"pret-viu:"+simbol+":"+exp))}
// v100.196 (auditul sever, 🔵2): biletul stă în adresa WebSocket-ului (deci poate ajunge în jurnale) ⇒ nu se mai semnează direct cu parola
// aplicației: cu RELEU_SECRET din .dev.vars (aleator, ≥ 32 de caractere) când există, altfel cu o cheie derivată o dată din parolă (alt domeniu de cheie)
export async function cheieReleu(env){const s=String(env&&env.RELEU_SECRET||"");if(s.length>=32)return s;const t=String(env&&env.APP_API_TOKEN||"");return t?"releu:"+await semneaza(t,"pret-viu-cheie"):""}
let deschise=0;const MAX_RELEE=8;

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

export async function onRequestGet({request,env}){
  if((request.headers.get("upgrade")||"").toLowerCase()!=="websocket")return json({error:"WEBSOCKET_REQUIRED"},426);
  if(!sameOrigin(request))return json({error:"ORIGIN_REFUSED"},403);
  const simbol=String(new URL(request.url).searchParams.get("simbol")||"").toUpperCase();
  if(!SIMBOL.test(simbol))return json({error:"SIMBOL_INVALID"},400);
  if(!(await biletBun(await cheieReleu(env),simbol,new URL(request.url).searchParams.get("b"),Date.now())))return json({error:"BILET_INVALID"},401);
  if(deschise>=MAX_RELEE)return json({error:"PREA_MULTE_RELEE"},429);
  deschise++;let rezervat=true;const elibereaza=()=>{if(rezervat){rezervat=false;deschise=Math.max(0,deschise-1)}};   // (revizia, M11): locul se ia înainte de await

  let sus;
  try{
    const r=await fetch("https://ws.pionex.com/wsPub",{headers:{Upgrade:"websocket"}});
    sus=r.webSocket;
    if(!sus){elibereaza();return json({error:"PIONEX_WS_REFUZ",status:r.status},502)}
  }catch(e){elibereaza();return json({error:"PIONEX_WS_INDISPONIBIL"},502)}
  sus.accept();

  const pereche=new WebSocketPair(),client=pereche[0],server=pereche[1];
  server.accept();
  let gata=false;
  const inchide=()=>{if(gata)return;gata=true;elibereaza();try{sus.close(1000,"gata")}catch(e){}try{server.close(1000,"gata")}catch(e){}};

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
// v100.176: biletul releului - POST cu parola în antet (requireApiAuth), pentru un simbol Pionex valid
export async function onRequestPost({request,env}){
  const auth=await requireApiAuth(request,env,"pret-viu-bilet",30);if(!auth.ok)return authErrorResponse(auth,H);
  if(!sameOrigin(request))return json({error:"ORIGIN_REFUSED"},403);
  const simbol=String(new URL(request.url).searchParams.get("simbol")||"").toUpperCase();
  if(!SIMBOL.test(simbol))return json({error:"SIMBOL_INVALID"},400);
  return json({bilet:await biletPentru(await cheieReleu(env),simbol,Date.now()),valabilS:60},200);
}
