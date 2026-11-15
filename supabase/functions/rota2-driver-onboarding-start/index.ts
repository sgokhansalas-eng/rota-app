
import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const url=Deno.env.get("SUPABASE_URL")!;
const secrets=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}");
const secretKey=secrets.default||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db=createClient(url,secretKey,{auth:{persistSession:false}});
const cors={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"POST, OPTIONS"
};
const json=(d:any,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{...cors,"content-type":"application/json; charset=utf-8"}});
const enc=new TextEncoder();
const b64=(a:Uint8Array)=>btoa(String.fromCharCode(...a));
async function sha256(s:string){
  const b=await crypto.subtle.digest("SHA-256",enc.encode(s));
  return Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,"0")).join("");
}

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS") return new Response("ok",{headers:cors});
  if(req.method!=="POST") return json({error:"method"},405);
  const token=b64(crypto.getRandomValues(new Uint8Array(32)));
  const tokenHash=await sha256(token);
  const {data,error}=await db.from("rota2_driver_registration_drafts")
    .insert({token_hash:tokenHash})
    .select("registration_id,expires_at")
    .single();
  if(error) return json({error:error.message},500);
  return json({ok:true,registrationId:data.registration_id,registrationToken:token,expiresAt:data.expires_at});
});
