
import { createClient } from "npm:@supabase/supabase-js@2.95.0";
const url=Deno.env.get("SUPABASE_URL")!;
const secrets=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}");
const key=secrets.default||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db=createClient(url,key,{auth:{persistSession:false}});
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
function extFor(type:string){
  if(type==="image/jpeg") return "jpg";
  if(type==="image/png") return "png";
  if(type==="application/pdf") return "pdf";
  return "";
}
Deno.serve(async(req)=>{
  if(req.method==="OPTIONS") return new Response("ok",{headers:cors});
  if(req.method!=="POST") return json({error:"method"},405);
  const b=await req.json().catch(()=>({}));
  const id=String(b.registrationId||"");
  const token=String(b.registrationToken||"");
  const vehicleType=String(b.vehiclePhotoType||"");
  const criminalType=String(b.criminalRecordType||"");
  const residenceType=String(b.residenceDocumentType||"");
  const exts=[extFor(vehicleType),extFor(criminalType),extFor(residenceType)];
  if(!id||!token||exts.some(x=>!x)) return json({error:"Kayıt veya dosya türü geçersiz"},400);

  const {data:draft,error}=await db.from("rota2_driver_registration_drafts")
    .select("*").eq("registration_id",id).maybeSingle();
  if(error) return json({error:error.message},500);
  if(!draft) return json({error:"Kayıt oturumu bulunamadı"},404);
  if(draft.completed_at) return json({error:"Bu kayıt zaten tamamlandı"},409);
  if(new Date(draft.expires_at).getTime()<Date.now()) return json({error:"Kayıt oturumunun süresi doldu"},410);
  if(await sha256(token)!==draft.token_hash) return json({error:"Kayıt oturumu geçersiz"},401);

  const base="registrations/"+id;
  const paths={
    vehiclePhoto:base+"/vehicle."+exts[0],
    criminalRecord:base+"/criminal."+exts[1],
    residenceDocument:base+"/residence."+exts[2],
  };

  const out:any={};
  for(const [k,path] of Object.entries(paths)){
    const {data,error}=await db.storage.from("rota-driver-documents").createSignedUploadUrl(path as string,{upsert:false});
    if(error) return json({error:error.message},500);
    out[k]={path,token:data.token};
  }
  return json({ok:true,uploads:out});
});
