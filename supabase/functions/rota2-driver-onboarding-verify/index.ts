
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
async function sha256(v:string){
  const b=await crypto.subtle.digest("SHA-256",enc.encode(v));
  return Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,"0")).join("");
}
Deno.serve(async(req)=>{
  if(req.method==="OPTIONS") return new Response("ok",{headers:cors});
  if(req.method!=="POST") return json({error:"method"},405);
  const b=await req.json().catch(()=>({}));
  const id=String(b.registrationId||"");
  const token=String(b.registrationToken||"");
  const firstName=String(b.firstName||"").trim();
  const lastName=String(b.lastName||"").trim();
  const identityHash=String(b.identityHash||"");
  const identityLast4=String(b.identityLast4||"");
  const credentialHash=String(b.credentialHash||"");
  const credentialLast4=String(b.credentialLast4||"");
  const credentialClass=String(b.credentialClass||"").trim().toLocaleUpperCase("tr-TR");
  const vehiclePlate=String(b.vehiclePlate||"").toLocaleUpperCase("tr-TR").replace(/[^A-Z0-9ÇĞİÖŞÜ]/g,"");
  if(!id||!token) return json({error:"Kayıt oturumu eksik"},400);
  if(firstName.length<2||lastName.length<2) return json({error:"Ad ve soyad zorunludur"},400);
  if(!/^[a-f0-9]{64}$/.test(identityHash)||identityLast4.length!==4) return json({error:"Kimlik bilgisi eksik"},400);
  if(!/^[a-f0-9]{64}$/.test(credentialHash)||credentialLast4.length<2) return json({error:"Ehliyet bilgisi eksik"},400);
  if(!credentialClass) return json({error:"Ehliyet sınıfı zorunludur"},400);
  if(vehiclePlate.length<5) return json({error:"Araç plakası zorunludur"},400);

  const {data:draft,error}=await db.from("rota2_driver_registration_drafts")
    .select("*").eq("registration_id",id).maybeSingle();
  if(error) return json({error:error.message},500);
  if(!draft) return json({error:"Kayıt oturumu bulunamadı"},404);
  if(draft.completed_at) return json({ok:true,alreadyComplete:true});
  if(new Date(draft.expires_at).getTime()<Date.now()) return json({error:"Kayıt oturumunun süresi doldu"},410);
  if(await sha256(token)!==draft.token_hash) return json({error:"Kayıt oturumu geçersiz"},401);

  const prefix="registrations/"+id;
  const {data:objects,error:listError}=await db.storage.from("rota-driver-documents").list(prefix,{limit:20});
  if(listError) return json({error:"Dosyalar kontrol edilemedi"},500);
  const names=(objects||[]).map((x:any)=>String(x.name||""));
  const hasA=names.some((n:string)=>n.startsWith("vehicle."));
  const hasB=names.some((n:string)=>n.startsWith("criminal."));
  const hasC=names.some((n:string)=>n.startsWith("residence."));
  if(!hasA||!hasB||!hasC) return json({error:"Tüm zorunlu dosyalar yüklenmelidir"},400);

  const {error:updateError}=await db.from("rota2_driver_registration_drafts")
    .update({
      completed_at:new Date().toISOString(),
      first_name:firstName,
      last_name:lastName,
      identity_hash:identityHash,
      identity_last4:identityLast4,
      credential_hash:credentialHash,
      credential_last4:credentialLast4,
      credential_class:credentialClass,
      vehicle_plate:vehiclePlate
    })
    .eq("registration_id",id);
  if(updateError) return json({error:updateError.message},500);
  return json({ok:true,complete:true});
});
