const {publicKey,privateKey}=await crypto.subtle.generateKey({name:"ECDSA",namedCurve:"P-256"},true,["sign","verify"]);
const raw=new Uint8Array(await crypto.subtle.exportKey("raw",publicKey)),jwk=await crypto.subtle.exportKey("jwk",privateKey);
const b64u=b=>Buffer.from(b).toString("base64url");
console.log("VAPID_PUBLIC_KEY="+b64u(raw));
console.log("VAPID_PRIVATE_KEY="+jwk.d);
console.log("Set VAPID_SUBJECT to a contact URI such as mailto:you@example.com");
