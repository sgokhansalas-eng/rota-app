
import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const url = Deno.env.get("SUPABASE_URL")!;
const secrets = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
const secretKey = secrets.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(url, secretKey, { auth: { persistSession: false } });

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { ...corsHeaders, "content-type":"application/json; charset=utf-8" }
});

const enc = new TextEncoder();
const dec = new TextDecoder();
const b64 = (a: Uint8Array) => btoa(String.fromCharCode(...a));
const unb64 = (s: string) => Uint8Array.from(atob(s), c => c.charCodeAt(0));

async function hashPassword(password:string,salt?:Uint8Array){
  const s=salt||crypto.getRandomValues(new Uint8Array(16));
  const key=await crypto.subtle.importKey("raw",enc.encode(password),"PBKDF2",false,["deriveBits"]);
  const bits=await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt:s,iterations:120000},key,256);
  return b64(s)+":"+b64(new Uint8Array(bits));
}
async function verifyPassword(password:string,stored:string){
  const [s,h]=stored.split(":"); if(!s||!h) return false;
  return (await hashPassword(password,unb64(s)))===stored;
}
async function sha256(s:string){
  const b=await crypto.subtle.digest("SHA-256",enc.encode(s));
  return Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,"0")).join("");
}
async function aesKey(){
  const raw=await crypto.subtle.digest("SHA-256",enc.encode("rota2-tc-v1:"+secretKey));
  return crypto.subtle.importKey("raw",raw,{name:"AES-GCM"},false,["encrypt","decrypt"]);
}
async function encryptTc(tc:string){
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const key=await aesKey();
  const out=await crypto.subtle.encrypt({name:"AES-GCM",iv},key,enc.encode(tc));
  return b64(iv)+"."+b64(new Uint8Array(out));
}
async function decryptTc(v:string|null){
  if(!v) return null;
  try{
    const [a,b]=v.split(".");
    const key=await aesKey();
    const out=await crypto.subtle.decrypt({name:"AES-GCM",iv:unb64(a)},key,unb64(b));
    return dec.decode(out);
  }catch{return null}
}
async function ibanKey(){
  const raw=await crypto.subtle.digest("SHA-256",enc.encode("rota2-iban-v1:"+secretKey));
  return crypto.subtle.importKey("raw",raw,{name:"AES-GCM"},false,["encrypt","decrypt"]);
}
async function encryptIban(iban:string){
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const key=await ibanKey();
  const out=await crypto.subtle.encrypt({name:"AES-GCM",iv},key,enc.encode(iban));
  return b64(iv)+"."+b64(new Uint8Array(out));
}
async function decryptIban(v:string|null){
  if(!v) return null;
  try{
    const [a,b]=v.split(".");
    const key=await ibanKey();
    const out=await crypto.subtle.decrypt({name:"AES-GCM",iv:unb64(a)},key,unb64(b));
    return dec.decode(out);
  }catch{return null}
}
function normalizeIban(v:string){
  return String(v||"").replace(/\s+/g,"").toUpperCase();
}
function validTrIban(v:string){
  const iban=normalizeIban(v);
  if(!/^TR\d{24}$/.test(iban)) return false;
  const rearranged=iban.slice(4)+iban.slice(0,4);
  let numeric="";
  for(const ch of rearranged){
    numeric += /[A-Z]/.test(ch) ? String(ch.charCodeAt(0)-55) : ch;
  }
  let rem=0;
  for(const ch of numeric) rem=(rem*10+Number(ch))%97;
  return rem===1;
}
async function makeSession(){
  const bytes=crypto.getRandomValues(new Uint8Array(32));
  const token=b64(bytes);
  return {token,hash:await sha256(token)};
}
async function verifyCustomerSession(accountId:string,token:string){
  if(!accountId||!token) return false;
  const {data}=await db.from("rota2_accounts").select("session_token_hash").eq("account_id",accountId).eq("role","customer").maybeSingle();
  if(!data?.session_token_hash) return false;
  return (await sha256(token))===data.session_token_hash;
}
async function verifyDriverSession(driverId:string,token:string){
  if(!driverId||!token) return false;
  const {data}=await db.from("rota2_accounts").select("session_token_hash").eq("driver_id",driverId).eq("role","driver").maybeSingle();
  if(!data?.session_token_hash) return false;
  return (await sha256(token))===data.session_token_hash;
}
function phone10(v:string){
  let d=String(v||"").replace(/\D/g,"");
  if(d.startsWith("90")) d=d.slice(2);
  if(d.startsWith("0")) d=d.slice(1);
  return d.slice(-10);
}
function phoneE164(v:string){ const d=phone10(v); return d.length===10?"+90"+d:""; }
function publishableKey(){
  const keys=JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")||"{}");
  return keys.default||Deno.env.get("SUPABASE_ANON_KEY")||"";
}
async function supabaseUserFromAccessToken(token:string){
  const keys=JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")||"{}");
  const publishable=keys.default||Deno.env.get("SUPABASE_ANON_KEY")||"";
  if(!publishable||!token) return null;
  const r=await fetch(url+"/auth/v1/user",{headers:{apikey:publishable,Authorization:"Bearer "+token}});
  if(!r.ok) return null;
  return await r.json().catch(()=>null);
}
function validTc(tc:string){
  if(!/^\d{11}$/.test(tc) || tc[0]==="0") return false;
  const d=tc.split("").map(Number);
  const odd=d[0]+d[2]+d[4]+d[6]+d[8];
  const even=d[1]+d[3]+d[5]+d[7];
  if(((odd*7-even)%10+10)%10!==d[9]) return false;
  return (d.slice(0,10).reduce((a,b)=>a+b,0)%10)===d[10];
}
const hav = (aLat:number,aLng:number,bLat:number,bLng:number) => {
  const R=6371, dLat=(bLat-aLat)*Math.PI/180, dLng=(bLng-aLng)*Math.PI/180;
  const s1=Math.sin(dLat/2), s2=Math.sin(dLng/2);
  const a=s1*s1+Math.cos(aLat*Math.PI/180)*Math.cos(bLat*Math.PI/180)*s2*s2;
  return 2*R*Math.asin(Math.sqrt(a));
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method === "GET" && new URL(req.url).searchParams.get("action")==="sms-config-check") {
    try{
      const keys=JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")||"{}");
      const publishable=keys.default||Deno.env.get("SUPABASE_ANON_KEY")||"";
      const rr=await fetch(url+"/auth/v1/settings",{headers:{apikey:publishable}});
      const jj=await rr.json().catch(()=>({}));
      return json({ok:rr.ok,external:jj.external||null,disableSignup:jj.disable_signup??null,phoneAutoconfirm:jj.phone_autoconfirm??null});
    }catch(e){return json({ok:false,error:"settings_check_failed"},500)}
  }
  const u = new URL(req.url);
  const action = u.searchParams.get("action") || "";

  if (req.method === "GET" && action === "trip-share-public") {
    const token=String(u.searchParams.get("token")||"").trim();
    if(!token) return json({error:"Paylaşım bağlantısı geçersiz"},400);
    const {data:share,error:se}=await db.from("rota2_trip_share_tokens").select("trip_id,expires_at,revoked_at").eq("token",token).maybeSingle();
    if(se) return json({error:se.message},500);
    if(!share||share.revoked_at||new Date(share.expires_at).getTime()<Date.now()) return json({error:"Paylaşım bağlantısının süresi dolmuş"},410);
    const {data:trip,error:te}=await db.from("rota2_trips").select("trip_id,driver_id,status,destination,pickup_lat,pickup_lng,destination_lat,destination_lng").eq("trip_id",share.trip_id).maybeSingle();
    if(te) return json({error:te.message},500);
    if(!trip) return json({error:"Yolculuk bulunamadı"},404);
    let driverLocation=null;
    if(trip.driver_id){
      const {data:d}=await db.from("rota2_drivers").select("lat,lng,updated_at").eq("driver_id",trip.driver_id).maybeSingle();
      if(d) driverLocation={lat:Number(d.lat),lng:Number(d.lng),updatedAt:d.updated_at};
    }
    return json({ok:true,trip:{
      status:trip.status,
      destination:trip.destination,
      pickup:{lat:Number(trip.pickup_lat),lng:Number(trip.pickup_lng)},
      destinationLocation:{lat:Number(trip.destination_lat),lng:Number(trip.destination_lng)},
      driverLocation
    }});
  }

  if (req.method === "GET") return json({ok:true,service:"rota2-core",version:29});
  if (req.method !== "POST") return json({error:"method"},405);

  const b = await req.json().catch(()=>({}));

  if(action==="register"){
    const role=String(b.role||"");
    const phone=String(b.phone||"").replace(/\D/g,"");
    const password=String(b.password||"");
    if(!["customer","driver"].includes(role) || phone.length<10 || password.length<6) return json({error:"Telefon veya şifre geçersiz"},400);

    let firstName:string|null=null,lastName:string|null=null,tcNo:string|null=null,tcHash:string|null=null,tcEnc:string|null=null;
    if(role==="customer"){
      firstName=String(b.firstName||"").trim();
      lastName=String(b.lastName||"").trim();
      tcNo=String(b.tcNo||"").replace(/\D/g,"");
      if(firstName.length<2 || lastName.length<2) return json({error:"Ad ve soyad zorunludur"},400);
      if(!validTc(tcNo)) return json({error:"T.C. kimlik numarası geçersiz"},400);
      tcHash=await sha256(tcNo);
      tcEnc=await encryptTc(tcNo);
      const {data:tcExisting}=await db.from("rota2_accounts").select("account_id").eq("role","customer").eq("tc_no_hash",tcHash).maybeSingle();
      if(tcExisting) return json({error:"Bu T.C. kimlik numarasıyla daha önce kayıt oluşturulmuş"},409);
    }

    const {data:existing}=await db.from("rota2_accounts").select("account_id").eq("role",role).eq("phone",phone).maybeSingle();
    if(existing) return json({error:"Bu telefon numarası zaten kayıtlı"},409);
    let driverDraft:any=null,driverRegistrationId:string|null=null;
    if(role==="driver"){
      const registrationId=String(b.registrationId||"").trim();
      const registrationToken=String(b.registrationToken||"");
      if(!registrationId||!registrationToken) return json({error:"Sürücü belgeleri tamamlanmadan kayıt oluşturulamaz"},400);
      const {data:draft,error:draftErr}=await db.from("rota2_driver_registration_drafts")
        .select("*").eq("registration_id",registrationId).maybeSingle();
      if(draftErr) return json({error:draftErr.message},500);
      if(!draft || !draft.completed_at) return json({error:"Sürücü belgeleri tamamlanmadan kayıt oluşturulamaz"},400);
      if(new Date(draft.expires_at).getTime()<Date.now()) return json({error:"Sürücü kayıt oturumunun süresi doldu"},410);
      if(await sha256(registrationToken)!==draft.token_hash) return json({error:"Sürücü kayıt oturumu geçersiz"},401);
      if(!draft.first_name || !draft.last_name || !draft.identity_hash || !draft.credential_hash || !draft.credential_class || !draft.vehicle_plate)
        return json({error:"Sürücü kayıt bilgileri eksik"},400);
      driverDraft=draft;
      driverRegistrationId=registrationId;
      firstName=String(draft.first_name);
      lastName=String(draft.last_name);
    }
    const driverId=role==="driver"?"D-"+phone.slice(-6):null;
    const password_hash=await hashPassword(password);
    const session=await makeSession();
    const {data:created,error}=await db.from("rota2_accounts").insert({
      role,phone,password_hash,driver_id:driverId,
      first_name:firstName,last_name:lastName,
      tc_no:null,tc_no_hash:tcHash,tc_no_enc:tcEnc,
      session_token_hash:session?.hash||null,phone_verified_at:null,phone_auth_user_id:null
    }).select("account_id,role,phone,driver_id,first_name,last_name").single();
    if(error) return json({error:error.message},500);
    if(role==="driver" && driverDraft && driverId){
      const prefix="registrations/"+driverRegistrationId;
      const {data:objects}=await db.storage.from("rota-driver-documents").list(prefix,{limit:20});
      const names=(objects||[]).map((x:any)=>String(x.name||""));
      const docA=names.find((n:string)=>n.startsWith("vehicle."))||"";
      const docB=names.find((n:string)=>n.startsWith("criminal."))||"";
      const docC=names.find((n:string)=>n.startsWith("residence."))||"";
      const {error:verr}=await db.from("rota2_driver_verification").insert({
        driver_id:driverId,
        account_id:created.account_id,
        identity_hash:driverDraft.identity_hash,
        identity_last4:driverDraft.identity_last4,
        credential_hash:driverDraft.credential_hash,
        credential_last4:driverDraft.credential_last4,
        credential_class:driverDraft.credential_class,
        vehicle_plate:driverDraft.vehicle_plate,
        doc_a_path:prefix+"/"+docA,
        doc_b_path:prefix+"/"+docB,
        doc_c_path:prefix+"/"+docC,
        complete:true
      });
      if(verr){
        await db.from("rota2_accounts").delete().eq("account_id",created.account_id);
        return json({error:verr.message},500);
      }
    }
    return json({
      ok:true,driverId,
      accountId:created.account_id,
      sessionToken:session?.token||null,
      profile: role==="customer" ? {firstName,lastName,tcNo,phone} : role==="driver" ? {
        firstName,lastName,phone,
        vehiclePlate:driverDraft?.vehicle_plate||"",
        licenseClass:driverDraft?.credential_class||"",
        documentsComplete:true
      } : null
    });
  }

  if(action==="login"){
    const role=String(b.role||"");
    const rawPhone=String(b.phone||"");
    const phone=rawPhone.replace(/\D/g,"");
    const p10=phone10(rawPhone);
    const candidates=Array.from(new Set([
      phone,
      p10,
      p10?"0"+p10:"",
      p10?"90"+p10:"",
      p10?"+90"+p10:""
    ].filter(Boolean)));
    const password=String(b.password||"");
    const {data:rows,error}=await db.from("rota2_accounts").select("*").eq("role",role).in("phone",candidates).limit(2);
    if(error) return json({error:error.message},500);
    const data=(rows||[])[0]||null;
    if(!data || !(await verifyPassword(password,data.password_hash))) return json({error:"Telefon veya şifre hatalı"},401);
    let profile:any=null,sessionToken:string|null=null;
    if(role==="customer"){
      profile={
        firstName:data.first_name||"",
        lastName:data.last_name||"",
        tcNo:await decryptTc(data.tc_no_enc),
        phone:data.phone
      };
      const session=await makeSession();
      sessionToken=session.token;
      await db.from("rota2_accounts").update({session_token_hash:session.hash}).eq("account_id",data.account_id);
    }
    if(role==="driver"){
      const session=await makeSession();
      sessionToken=session.token;
      await db.from("rota2_accounts").update({session_token_hash:session.hash}).eq("account_id",data.account_id);
      const {data:v}=await db.from("rota2_driver_verification").select("vehicle_plate,credential_class,complete").eq("driver_id",data.driver_id).maybeSingle();
      const {data:d}=await db.from("rota2_drivers").select("vehicle").eq("driver_id",data.driver_id).maybeSingle();
      profile={
        firstName:data.first_name||"",
        lastName:data.last_name||"",
        phone:data.phone||"",
        vehiclePlate:v?.vehicle_plate||"",
        licenseClass:v?.credential_class||"",
        vehicle:d?.vehicle||"Normal Araç",
        documentsComplete:!!v?.complete
      };
    }
    return json({ok:true,driverId:data.driver_id||null,accountId:data.account_id,sessionToken,profile});
  }

  if(action==="complete-existing-driver"){
    const driverId=String(b.driverId||"").trim();
    const sessionToken=String(b.sessionToken||"");
    const registrationId=String(b.registrationId||"").trim();
    const registrationToken=String(b.registrationToken||"");
    if(!driverId||!sessionToken||!registrationId||!registrationToken) return json({error:"Eksik doğrulama bilgisi"},400);
    if(!(await verifyDriverSession(driverId,sessionToken))) return json({error:"Sürücü oturumu geçersiz"},401);

    const {data:draft,error:draftErr}=await db.from("rota2_driver_registration_drafts")
      .select("*").eq("registration_id",registrationId).maybeSingle();
    if(draftErr) return json({error:draftErr.message},500);
    if(!draft || !draft.completed_at) return json({error:"Zorunlu bilgiler ve belgeler tamamlanmamış"},400);
    if(new Date(draft.expires_at).getTime()<Date.now()) return json({error:"Kayıt oturumunun süresi doldu"},410);
    if(await sha256(registrationToken)!==draft.token_hash) return json({error:"Kayıt oturumu geçersiz"},401);

    const {data:acct,error:ae}=await db.from("rota2_accounts")
      .select("account_id,first_name,last_name,phone")
      .eq("role","driver").eq("driver_id",driverId).maybeSingle();
    if(ae) return json({error:ae.message},500);
    if(!acct) return json({error:"Sürücü hesabı bulunamadı"},404);

    const {data:existing}=await db.from("rota2_driver_verification").select("driver_id").eq("driver_id",driverId).maybeSingle();
    if(existing) return json({ok:true,alreadyComplete:true});

    const {data:dupId}=await db.from("rota2_driver_verification").select("driver_id").eq("identity_hash",draft.identity_hash).maybeSingle();
    if(dupId) return json({error:"Bu kimlik bilgisi başka bir sürücü hesabında kayıtlı"},409);
    const {data:dupCred}=await db.from("rota2_driver_verification").select("driver_id").eq("credential_hash",draft.credential_hash).maybeSingle();
    if(dupCred) return json({error:"Bu ehliyet bilgisi başka bir sürücü hesabında kayıtlı"},409);

    const prefix="registrations/"+registrationId;
    const {data:objects,error:listErr}=await db.storage.from("rota-driver-documents").list(prefix,{limit:20});
    if(listErr) return json({error:"Belgeler kontrol edilemedi"},500);
    const names=(objects||[]).map((x:any)=>String(x.name||""));
    const docA=names.find((n:string)=>n.startsWith("vehicle."))||"";
    const docB=names.find((n:string)=>n.startsWith("criminal."))||"";
    const docC=names.find((n:string)=>n.startsWith("residence."))||"";
    if(!docA||!docB||!docC) return json({error:"Tüm zorunlu belgeler yüklenmelidir"},400);

    const {error:ve}=await db.from("rota2_driver_verification").insert({
      driver_id:driverId,
      account_id:acct.account_id,
      identity_hash:draft.identity_hash,
      identity_last4:draft.identity_last4,
      credential_hash:draft.credential_hash,
      credential_last4:draft.credential_last4,
      credential_class:draft.credential_class,
      vehicle_plate:draft.vehicle_plate,
      doc_a_path:prefix+"/"+docA,
      doc_b_path:prefix+"/"+docB,
      doc_c_path:prefix+"/"+docC,
      complete:true
    });
    if(ve) return json({error:ve.message},500);

    await db.from("rota2_accounts").update({
      first_name:draft.first_name,
      last_name:draft.last_name
    }).eq("account_id",acct.account_id);

    return json({ok:true,complete:true,profile:{
      firstName:draft.first_name||acct.first_name||"",
      lastName:draft.last_name||acct.last_name||"",
      phone:acct.phone||"",
      vehiclePlate:draft.vehicle_plate||"",
      licenseClass:draft.credential_class||"",
      documentsComplete:true
    }});
  }

  if(action==="driver-profile"){
    const driverId=String(b.driverId||"").trim();
    const sessionToken=String(b.sessionToken||"");
    if(!driverId||!sessionToken) return json({error:"Sürücü oturumu eksik"},400);
    if(!(await verifyDriverSession(driverId,sessionToken))) return json({error:"Sürücü oturumu geçersiz"},401);
    const {data:a,error:ae}=await db.from("rota2_accounts").select("first_name,last_name,phone,driver_id").eq("role","driver").eq("driver_id",driverId).maybeSingle();
    if(ae) return json({error:ae.message},500);
    if(!a) return json({error:"Sürücü bulunamadı"},404);
    const {data:v}=await db.from("rota2_driver_verification").select("vehicle_plate,credential_class,identity_last4,credential_last4,complete").eq("driver_id",driverId).maybeSingle();
    const {data:d}=await db.from("rota2_drivers").select("vehicle").eq("driver_id",driverId).maybeSingle();
    return json({ok:true,profile:{
      firstName:a.first_name||"",
      lastName:a.last_name||"",
      phone:a.phone||"",
      vehiclePlate:v?.vehicle_plate||"",
      licenseClass:v?.credential_class||"",
      identityLast4:v?.identity_last4||"",
      licenseLast4:v?.credential_last4||"",
      vehicle:d?.vehicle||"Normal Araç",
      documentsComplete:!!v?.complete
    }});
  }

  if(action==="send-login-sms"){
    const accountId=String(b.accountId||"").trim();
    if(!accountId) return json({error:"Hesap bilgisi eksik"},400);
    const {data:account,error}=await db.from("rota2_accounts").select("account_id,role,phone,phone_verified_at").eq("account_id",accountId).eq("role","customer").maybeSingle();
    if(error) return json({error:error.message},500);
    if(!account) return json({error:"Müşteri hesabı bulunamadı"},404);
    if(account.phone_verified_at) return json({ok:true,alreadyVerified:true});
    const phone=phoneE164(account.phone);
    if(!phone) return json({error:"Telefon numarası geçersiz"},400);
    const key=publishableKey();
    if(!key) return json({error:"SMS servisi yapılandırılmamış"},503);
    const rr=await fetch(url+"/auth/v1/otp",{
      method:"POST",
      headers:{apikey:key,"Content-Type":"application/json"},
      body:JSON.stringify({phone,create_user:true})
    });
    const jj=await rr.json().catch(()=>({}));
    if(!rr.ok){
      console.error("sms send failed",rr.status,jj);
      let msg=String(jj.msg||jj.message||jj.error_description||jj.error||"SMS gönderilemedi");
      if(msg.toLowerCase().includes("unsupported phone provider")) msg="SMS servisi henüz aktif değil. Yönetici SMS sağlayıcısını yapılandırmalı.";
      return json({error:msg,smsProviderRequired:true},rr.status>=500?503:400);
    }
    return json({ok:true,smsSent:true,phoneMasked:"+90 5** *** ** **"});
  }

  if(action==="verify-login-sms"){
    const accountId=String(b.accountId||"").trim();
    const code=String(b.code||"").replace(/\D/g,"");
    if(!accountId || !/^\d{6}$/.test(code)) return json({error:"6 haneli SMS kodu gerekli"},400);
    const {data:account,error}=await db.from("rota2_accounts").select("*").eq("account_id",accountId).eq("role","customer").maybeSingle();
    if(error) return json({error:error.message},500);
    if(!account) return json({error:"Müşteri hesabı bulunamadı"},404);
    const phone=phoneE164(account.phone);
    const key=publishableKey();
    if(!key) return json({error:"SMS servisi yapılandırılmamış"},503);
    const rr=await fetch(url+"/auth/v1/verify",{
      method:"POST",
      headers:{apikey:key,"Content-Type":"application/json"},
      body:JSON.stringify({type:"sms",phone,token:code})
    });
    const jj=await rr.json().catch(()=>({}));
    if(!rr.ok || !jj.user?.id){
      console.error("sms verify failed",rr.status,jj);
      const msg=String(jj.msg||jj.message||jj.error_description||jj.error||"SMS kodu hatalı veya süresi dolmuş");
      return json({error:msg},400);
    }
    if(phone10(jj.user.phone||"")!==phone10(account.phone)) return json({error:"SMS doğrulaması telefon numarasıyla eşleşmedi"},403);
    const session=await makeSession();
    const now=new Date().toISOString();
    const {error:ue}=await db.from("rota2_accounts").update({
      phone_verified_at:now,
      phone_auth_user_id:jj.user.id,
      session_token_hash:session.hash
    }).eq("account_id",accountId);
    if(ue) return json({error:ue.message},500);
    return json({
      ok:true,accountId,sessionToken:session.token,
      profile:{
        firstName:account.first_name||"",
        lastName:account.last_name||"",
        tcNo:await decryptTc(account.tc_no_enc),
        phone:account.phone
      }
    });
  }

  if(action==="complete-customer-profile"){
    const accountId=String(b.accountId||"").trim();
    const sessionToken=String(b.sessionToken||"");
    const firstName=String(b.firstName||"").trim();
    const lastName=String(b.lastName||"").trim();
    const tcNo=String(b.tcNo||"").replace(/\\D/g,"");
    if(!accountId || !sessionToken) return json({error:"Oturum bilgisi eksik"},400);
    if(!(await verifyCustomerSession(accountId,sessionToken))) return json({error:"Oturum geçersiz. Tekrar giriş yapın."},401);
    if(firstName.length<2 || lastName.length<2) return json({error:"Ad ve soyad zorunludur"},400);
    if(!validTc(tcNo)) return json({error:"T.C. kimlik numarası geçersiz"},400);
    const tcHash=await sha256(tcNo);
    const {data:existing}=await db.from("rota2_accounts").select("account_id").eq("role","customer").eq("tc_no_hash",tcHash).neq("account_id",accountId).maybeSingle();
    if(existing) return json({error:"Bu T.C. kimlik numarasıyla daha önce kayıt oluşturulmuş"},409);
    const tcEnc=await encryptTc(tcNo);
    const {error}=await db.from("rota2_accounts").update({
      first_name:firstName,last_name:lastName,tc_no:null,tc_no_hash:tcHash,tc_no_enc:tcEnc
    }).eq("account_id",accountId).eq("role","customer");
    if(error) return json({error:error.message},500);
    return json({ok:true,profile:{accountId,firstName,lastName,tcNo}});
  }

  if(action==="confirm-phone"){
    const accountId=String(b.accountId||"").trim();
    const accessToken=String(b.accessToken||"").trim();
    if(!accountId||!accessToken) return json({error:"SMS doğrulama bilgisi eksik"},400);
    const {data:account,error}=await db.from("rota2_accounts").select("*").eq("account_id",accountId).eq("role","customer").maybeSingle();
    if(error) return json({error:error.message},500);
    if(!account) return json({error:"Müşteri hesabı bulunamadı"},404);
    const authUser=await supabaseUserFromAccessToken(accessToken);
    if(!authUser?.id || phone10(authUser.phone)!==phone10(account.phone)) return json({error:"SMS doğrulaması telefon numarasıyla eşleşmedi"},403);
    const session=await makeSession();
    const now=new Date().toISOString();
    const {error:ue}=await db.from("rota2_accounts").update({
      phone_verified_at:now,
      phone_auth_user_id:authUser.id,
      session_token_hash:session.hash
    }).eq("account_id",accountId);
    if(ue) return json({error:ue.message},500);
    return json({ok:true,accountId,sessionToken:session.token,profile:{
      firstName:account.first_name||"",
      lastName:account.last_name||"",
      tcNo:await decryptTc(account.tc_no_enc),
      phone:account.phone
    }});
  }

  if(action==="customer-profile"){
    const accountId=String(b.accountId||"").trim();
    const sessionToken=String(b.sessionToken||"");
    if(!accountId || !sessionToken) return json({error:"Oturum bilgisi eksik"},400);
    if(!(await verifyCustomerSession(accountId,sessionToken))) return json({error:"Oturum geçersiz. Tekrar giriş yapın."},401);
    const {data,error}=await db.from("rota2_accounts").select("account_id,role,phone,first_name,last_name,tc_no_enc,email,email_verified_at").eq("account_id",accountId).eq("role","customer").maybeSingle();
    if(error) return json({error:error.message},500);
    if(!data) return json({error:"Müşteri hesabı bulunamadı"},404);
    return json({ok:true,profile:{
      accountId:data.account_id,
      firstName:data.first_name||"",
      lastName:data.last_name||"",
      phone:data.phone,
      tcNo:await decryptTc(data.tc_no_enc),
      email:data.email||"",
      emailVerified:!!data.email_verified_at
    }});
  }

  if(action==="customer-change-password"){
    const accountId=String(b.accountId||"").trim();
    const sessionToken=String(b.sessionToken||"");
    const currentPassword=String(b.currentPassword||"");
    const newPassword=String(b.newPassword||"");
    if(!accountId||!sessionToken) return json({error:"Oturum bilgisi eksik"},400);
    if(!(await verifyCustomerSession(accountId,sessionToken))) return json({error:"Oturum geçersiz. Tekrar giriş yapın."},401);
    if(newPassword.length<6) return json({error:"Yeni şifre en az 6 karakter olmalı"},400);
    const {data:account,error}=await db.from("rota2_accounts")
      .select("account_id,password_hash").eq("account_id",accountId).eq("role","customer").maybeSingle();
    if(error) return json({error:error.message},500);
    if(!account || !(await verifyPassword(currentPassword,account.password_hash)))
      return json({error:"Mevcut şifre hatalı"},401);
    const password_hash=await hashPassword(newPassword);
    const {error:up}=await db.from("rota2_accounts").update({password_hash}).eq("account_id",accountId).eq("role","customer");
    if(up) return json({error:up.message},500);
    return json({ok:true,passwordChanged:true});
  }

  if(action==="customer-change-phone"){
    const accountId=String(b.accountId||"").trim();
    const sessionToken=String(b.sessionToken||"");
    const currentPassword=String(b.currentPassword||"");
    const newPhone10=phone10(String(b.newPhone||""));
    if(!accountId||!sessionToken) return json({error:"Oturum bilgisi eksik"},400);
    if(!(await verifyCustomerSession(accountId,sessionToken))) return json({error:"Oturum geçersiz. Tekrar giriş yapın."},401);
    if(newPhone10.length!==10 || newPhone10[0]!=="5") return json({error:"Geçerli cep telefonu numarası girin"},400);
    const {data:account,error}=await db.from("rota2_accounts")
      .select("account_id,password_hash,phone").eq("account_id",accountId).eq("role","customer").maybeSingle();
    if(error) return json({error:error.message},500);
    if(!account || !(await verifyPassword(currentPassword,account.password_hash)))
      return json({error:"Mevcut şifre hatalı"},401);

    const candidates=[newPhone10,"0"+newPhone10,"90"+newPhone10,"+90"+newPhone10];
    const {data:dup}=await db.from("rota2_accounts").select("account_id")
      .eq("role","customer").in("phone",candidates).neq("account_id",accountId).maybeSingle();
    if(dup) return json({error:"Bu telefon numarası başka bir hesapta kayıtlı"},409);

    const storedPhone="0"+newPhone10;
    const {error:up}=await db.from("rota2_accounts").update({
      phone:storedPhone,
      phone_verified_at:null,
      phone_auth_user_id:null
    }).eq("account_id",accountId).eq("role","customer");
    if(up) return json({error:up.message},500);
    return json({ok:true,phoneChanged:true,phone:storedPhone});
  }

  if (action === "heartbeat") {
    const driverId=String(b.driverId||"").trim();
    const sessionToken=String(b.sessionToken||"");
    const requestedVehicle=String(b.vehicle||"").trim();
    const lat=Number(b.lat), lng=Number(b.lng);
    if(!driverId || !Number.isFinite(lat) || !Number.isFinite(lng)) return json({error:"Geçersiz sürücü konumu"},400);
    if(sessionToken && !(await verifyDriverSession(driverId,sessionToken))) return json({error:"Sürücü oturumu geçersiz"},401);
    const {data:old}=await db.from("rota2_drivers").select("busy,vehicle").eq("driver_id",driverId).maybeSingle();
    const vehicle=requestedVehicle || old?.vehicle || "Normal Araç";
    const now=new Date().toISOString();
    const {error}=await db.from("rota2_drivers").upsert({
      driver_id:driverId,vehicle,lat,lng,online:true,busy:old?.busy||false,updated_at:now
    },{onConflict:"driver_id"});
    if(error) return json({error:error.message},500);
    return json({ok:true,updatedAt:now});
  }

  if (action === "offline") {
    const driverId=String(b.driverId||"").trim();
    if(driverId) await db.from("rota2_drivers").update({online:false,updated_at:new Date().toISOString()}).eq("driver_id",driverId);
    return json({ok:true});
  }

  if (action === "drivers-nearby") {
    const {data,error}=await db.from("rota2_drivers")
      .select("driver_id,vehicle,lat,lng,online,busy,updated_at")
      .eq("online",true);
    if(error) return json({error:error.message},500);
    return json({ok:true,drivers:data||[]});
  }

  if (action === "nearby-map-drivers") {
    const lat=Number(b.lat), lng=Number(b.lng);
    const radiusKm=Math.min(20,Math.max(1,Number(b.radiusKm||15)));
    if(!Number.isFinite(lat) || !Number.isFinite(lng)) return json({error:"Konum bilgisi eksik"},400);

    const cutoff=new Date(Date.now()-120_000).toISOString();
    const {data,error}=await db.from("rota2_drivers")
      .select("driver_id,vehicle,lat,lng,online,busy,updated_at")
      .eq("online",true)
      .gte("updated_at",cutoff);
    if(error) return json({error:error.message},500);

    const drivers=(data||[])
      .filter((d:any)=>Number.isFinite(Number(d.lat))&&Number.isFinite(Number(d.lng)))
      .map((d:any)=>({
        driverId:d.driver_id,
        vehicle:d.vehicle||"Normal Araç",
        lat:Number(d.lat),
        lng:Number(d.lng),
        busy:!!d.busy,
        updatedAt:d.updated_at,
        distanceKm:Number(hav(lat,lng,Number(d.lat),Number(d.lng)).toFixed(2))
      }))
      .filter((d:any)=>d.distanceKm<=radiusKm)
      .sort((a:any,b:any)=>a.distanceKm-b.distanceKm)
      .slice(0,40);

    return json({ok:true,radiusKm,drivers});
  }

  if (action === "customer-nearby-drivers") {
    const accountId=String(b.accountId||"").trim();
    const sessionToken=String(b.sessionToken||"");
    const lat=Number(b.lat), lng=Number(b.lng);
    const radiusKm=Math.min(15,Math.max(1,Number(b.radiusKm||15)));
    if(!accountId || !sessionToken) return json({error:"Müşteri oturumu eksik"},400);
    if(!(await verifyCustomerSession(accountId,sessionToken))) return json({error:"Müşteri oturumu geçersiz"},401);
    if(!Number.isFinite(lat) || !Number.isFinite(lng)) return json({error:"Müşteri konumu eksik"},400);

    const cutoff=new Date(Date.now()-90_000).toISOString();
    const {data,error}=await db.from("rota2_drivers")
      .select("vehicle,lat,lng,online,busy,updated_at")
      .eq("online",true)
      .eq("busy",false)
      .gte("updated_at",cutoff);
    if(error) return json({error:error.message},500);

    const drivers=(data||[])
      .filter((d:any)=>Number.isFinite(Number(d.lat))&&Number.isFinite(Number(d.lng)))
      .map((d:any)=>({
        vehicle:d.vehicle||"Normal Araç",
        lat:Number(d.lat),
        lng:Number(d.lng),
        updatedAt:d.updated_at,
        distanceKm:Number(hav(lat,lng,Number(d.lat),Number(d.lng)).toFixed(2))
      }))
      .filter((d:any)=>d.distanceKm<=radiusKm)
      .sort((a:any,b:any)=>a.distanceKm-b.distanceKm)
      .slice(0,40);

    return json({ok:true,radiusKm,drivers});
  }

  if (action === "match") {
    const pickup=b.pickup||{}, target=b.target||{};
    const vehicle=String(b.vehicle||"Normal Araç");
    const customerAccountId=String(b.customerAccountId||"").trim()||null;
    const customerSessionToken=String(b.customerSessionToken||"");
    const paymentMethod=String(b.paymentMethod||"cash");
    const promoCode=String(b.promoCode||"").trim().toUpperCase()||null;
    const corporateId=String(b.corporateId||"").trim()||null;
    if(customerAccountId && !(await verifyCustomerSession(customerAccountId,customerSessionToken))) return json({error:"Müşteri oturumu geçersiz. Tekrar giriş yapın."},401);
    if(!["cash","iban","card"].includes(paymentMethod)) return json({error:"Ödeme yöntemi geçersiz"},400);
    const pLat=Number(pickup.lat), pLng=Number(pickup.lng), tLat=Number(target.lat), tLng=Number(target.lng);
    if(![pLat,pLng,tLat,tLng].every(Number.isFinite)) return json({error:"Konum bilgisi eksik"},400);

    const {data:drivers,error}=await db.from("rota2_drivers")
      .select("driver_id,vehicle,lat,lng,online,busy,updated_at")
      .eq("online",true)
      .eq("busy",false)
      .eq("vehicle",vehicle);
    if(error) return json({error:error.message},500);

    const ranked=(drivers||[])
      .map((d:any)=>({...d,distance:hav(pLat,pLng,Number(d.lat),Number(d.lng))}))
      .filter((d:any)=>Number.isFinite(d.distance) && d.distance<=15)
      .sort((a:any,b:any)=>a.distance-b.distance);

    if(!ranked.length) return json({error:"15 km içinde uygun çevrimiçi sürücü bulunamadı"},404);

    let requestedFare=Math.max(0,Number(b.fare||0));
    let discountAmount=0;
    if(promoCode && customerAccountId){
      const nowIso=new Date().toISOString();
      const {data:p}=await db.from("rota2_promo_codes").select("*").eq("code",promoCode).eq("active",true).maybeSingle();
      if(!p) return json({error:"Promosyon kodu geçersiz"},400);
      if(p.starts_at && p.starts_at>nowIso) return json({error:"Promosyon henüz başlamadı"},409);
      if(p.ends_at && p.ends_at<nowIso) return json({error:"Promosyon süresi doldu"},409);
      if(p.max_uses && Number(p.used_count||0)>=Number(p.max_uses)) return json({error:"Promosyon kullanım limiti doldu"},409);
      discountAmount=Number((requestedFare*Number(p.discount_percent||0)/100).toFixed(2));
      requestedFare=Math.max(0,Number((requestedFare-discountAmount).toFixed(2)));
    }

    if(corporateId && customerAccountId){
      const {data:member}=await db.from("rota2_corporate_members")
        .select("corporate_id").eq("corporate_id",corporateId).eq("account_id",customerAccountId).eq("active",true).maybeSingle();
      if(!member) return json({error:"Kurumsal hesap yetkisi bulunamadı"},403);
    }

    const first:any=ranked[0];
    const pickupCode=String(Math.floor(1000+Math.random()*9000));
    const pickupCodeHash=await sha256(pickupCode);
    const now=new Date();
    const firstExpires=new Date(now.getTime()+15_000).toISOString();

    const {data:trip,error:tripErr}=await db.from("rota2_trips").insert({
      driver_id:first.driver_id,
      pickup_lat:pLat,pickup_lng:pLng,
      destination:String(b.destination||"Hedef"),
      destination_lat:tLat,destination_lng:tLng,
      distance_km:Number(b.distanceKm||0),
      fare:requestedFare,
      payment_method:paymentMethod,
      promo_code:promoCode,
      discount_amount:discountAmount,
      corporate_id:corporateId,
      vehicle,
      status:"assigned",
      pickup_code:pickupCode,
      pickup_code_hash:pickupCodeHash,
      pickup_verified_at:null,
      customer_account_id:customerAccountId
    }).select("*").single();
    if(tripErr) return json({error:tripErr.message},500);

    const candidates=ranked.slice(0,20).map((d:any,idx:number)=>({
      trip_id:trip.trip_id,
      driver_id:d.driver_id,
      distance_km:Number(d.distance.toFixed(3)),
      status:idx===0?"pending":"queued",
      offer_order:idx+1,
      offer_started_at:idx===0?now.toISOString():null,
      offer_expires_at:idx===0?firstExpires:null,
      updated_at:now.toISOString()
    }));
    const {error:ce}=await db.from("rota2_trip_candidates").insert(candidates);
    if(ce){
      await db.from("rota2_trips").delete().eq("trip_id",trip.trip_id);
      return json({error:ce.message},500);
    }

    if(promoCode && customerAccountId){
      await db.from("rota2_promo_redemptions").insert({
        account_id:customerAccountId,code:promoCode,trip_id:trip.trip_id,discount_amount:discountAmount
      });
      await db.from("rota2_promo_codes").update({used_count:(await db.from("rota2_promo_codes").select("used_count").eq("code",promoCode).maybeSingle()).data?.used_count+1||1}).eq("code",promoCode);
    }

    return json({
      ok:true,
      fare:requestedFare,
      discountAmount,
      notifiedDriverCount:1,
      candidateCount:candidates.length,
      radiusKm:15,
      offerSeconds:15,
      nearestDriver:{driverId:first.driver_id,vehicle:first.vehicle,etaMinutes:Math.max(2,Math.round(first.distance/0.5))},
      tripId:trip.trip_id,
      pickupCode
    });
  }

  if (action === "customer-cancel-trip") {
    const tripId=String(b.tripId||"").trim();
    const accountId=String(b.accountId||"").trim();
    const sessionToken=String(b.sessionToken||"");
    const cancelReason=String(b.cancelReason||"").trim().slice(0,120)||null;
    if(!tripId || !accountId || !sessionToken) return json({error:"Yolculuk veya oturum bilgisi eksik"},400);
    if(!(await verifyCustomerSession(accountId,sessionToken))) return json({error:"Müşteri oturumu geçersiz"},401);

    const {data:trip,error:te}=await db.from("rota2_trips")
      .select("trip_id,status,customer_account_id,driver_id,pickup_verified_at")
      .eq("trip_id",tripId)
      .eq("customer_account_id",accountId)
      .maybeSingle();
    if(te) return json({error:te.message},500);
    if(!trip) return json({error:"Yolculuk bulunamadı"},404);
    if(trip.status==="cancelled") return json({ok:true,alreadyCancelled:true});
    if(!["assigned","accepted"].includes(String(trip.status||"")) || trip.pickup_verified_at)
      return json({error:"Yolculuk başladıktan sonra çağrı iptal edilemez"},409);

    const now=new Date().toISOString();
    const {data:cancelled,error:ce}=await db.from("rota2_trips")
      .update({status:"cancelled",cancel_reason:cancelReason,updated_at:now})
      .eq("trip_id",tripId)
      .eq("customer_account_id",accountId)
      .in("status",["assigned","accepted"])
      .is("pickup_verified_at",null)
      .select("trip_id")
      .maybeSingle();
    if(ce) return json({error:ce.message},500);
    if(!cancelled) return json({error:"Çağrı durumu değişti. Lütfen tekrar deneyin."},409);

    await db.from("rota2_trip_candidates")
      .update({status:"expired",updated_at:now})
      .eq("trip_id",tripId)
      .in("status",["queued","pending","accepted"]);
    if(trip.driver_id){
      await db.from("rota2_drivers").update({busy:false,updated_at:now}).eq("driver_id",trip.driver_id);
    }

    return json({ok:true,cancelled:true,tripId});
  }


  if (action === "customer-favorites") {
    const accountId=String(b.accountId||"").trim();
    const sessionToken=String(b.sessionToken||"");
    if(!accountId||!sessionToken) return json({error:"Oturum bilgisi eksik"},400);
    if(!(await verifyCustomerSession(accountId,sessionToken))) return json({error:"Oturum geçersiz"},401);
    const {data,error}=await db.from("rota2_customer_favorites")
      .select("favorite_id,kind,label,address,lat,lng,created_at,updated_at")
      .eq("account_id",accountId).order("created_at",{ascending:true}).limit(50);
    if(error) return json({error:error.message},500);
    return json({ok:true,favorites:data||[]});
  }

  if (action === "save-customer-favorite") {
    const accountId=String(b.accountId||"").trim();
    const sessionToken=String(b.sessionToken||"");
    const label=String(b.label||"").trim().slice(0,60);
    const address=String(b.address||"").trim().slice(0,300);
    const kind=String(b.kind||"custom").trim().slice(0,20);
    const lat=Number(b.lat),lng=Number(b.lng);
    if(!accountId||!sessionToken) return json({error:"Oturum bilgisi eksik"},400);
    if(!(await verifyCustomerSession(accountId,sessionToken))) return json({error:"Oturum geçersiz"},401);
    if(!label||!address||!Number.isFinite(lat)||!Number.isFinite(lng)) return json({error:"Favori adres bilgisi eksik"},400);
    const now=new Date().toISOString();
    const {data,error}=await db.from("rota2_customer_favorites").upsert({
      account_id:accountId,kind,label,address,lat,lng,updated_at:now
    },{onConflict:"account_id,label"}).select("favorite_id,kind,label,address,lat,lng").single();
    if(error) return json({error:error.message},500);
    return json({ok:true,favorite:data});
  }

  if (action === "delete-customer-favorite") {
    const accountId=String(b.accountId||"").trim();
    const sessionToken=String(b.sessionToken||"");
    const favoriteId=String(b.favoriteId||"").trim();
    if(!accountId||!sessionToken||!favoriteId) return json({error:"Bilgi eksik"},400);
    if(!(await verifyCustomerSession(accountId,sessionToken))) return json({error:"Oturum geçersiz"},401);
    const {error}=await db.from("rota2_customer_favorites").delete().eq("favorite_id",favoriteId).eq("account_id",accountId);
    if(error) return json({error:error.message},500);
    return json({ok:true});
  }

  if (action === "customer-settings") {
    const accountId=String(b.accountId||"").trim();
    const sessionToken=String(b.sessionToken||"");
    if(!accountId||!sessionToken) return json({error:"Oturum bilgisi eksik"},400);
    if(!(await verifyCustomerSession(accountId,sessionToken))) return json({error:"Oturum geçersiz"},401);
    const {data,error}=await db.from("rota2_customer_settings")
      .select("account_id,emergency_phone,payment_method,quiet_ride,corporate_id,updated_at")
      .eq("account_id",accountId).maybeSingle();
    if(error) return json({error:error.message},500);
    return json({ok:true,settings:data||{account_id:accountId,emergency_phone:null,payment_method:"cash",quiet_ride:false,corporate_id:null}});
  }

  if (action === "save-customer-settings") {
    const accountId=String(b.accountId||"").trim();
    const sessionToken=String(b.sessionToken||"");
    if(!accountId||!sessionToken) return json({error:"Oturum bilgisi eksik"},400);
    if(!(await verifyCustomerSession(accountId,sessionToken))) return json({error:"Oturum geçersiz"},401);
    const emergencyPhone=phone10(String(b.emergencyPhone||""));
    const paymentMethod=String(b.paymentMethod||"cash");
    const quietRide=!!b.quietRide;
    const corporateId=String(b.corporateId||"").trim()||null;
    if(!["cash","iban","card"].includes(paymentMethod)) return json({error:"Ödeme yöntemi geçersiz"},400);
    const {data,error}=await db.from("rota2_customer_settings").upsert({
      account_id:accountId,
      emergency_phone:emergencyPhone.length===10?emergencyPhone:null,
      payment_method:paymentMethod,
      quiet_ride:quietRide,
      corporate_id:corporateId,
      updated_at:new Date().toISOString()
    },{onConflict:"account_id"}).select("*").single();
    if(error) return json({error:error.message},500);
    return json({ok:true,settings:data});
  }

  if (action === "customer-recent-places") {
    const accountId=String(b.accountId||"").trim();
    const sessionToken=String(b.sessionToken||"");
    if(!accountId||!sessionToken) return json({error:"Oturum bilgisi eksik"},400);
    if(!(await verifyCustomerSession(accountId,sessionToken))) return json({error:"Oturum geçersiz"},401);
    const {data,error}=await db.from("rota2_trips")
      .select("destination,destination_lat,destination_lng,created_at")
      .eq("customer_account_id",accountId)
      .in("status",["accepted","completed"])
      .order("created_at",{ascending:false}).limit(30);
    if(error) return json({error:error.message},500);
    const seen=new Set<string>(); const places:any[]=[];
    for(const x of (data||[])){
      const k=(String(x.destination||"")+"|"+Number(x.destination_lat).toFixed(5)+"|"+Number(x.destination_lng).toFixed(5));
      if(seen.has(k)) continue; seen.add(k);
      places.push({label:x.destination,lat:Number(x.destination_lat),lng:Number(x.destination_lng),createdAt:x.created_at});
      if(places.length>=10) break;
    }
    return json({ok:true,places});
  }

  if (action === "validate-promo") {
    const accountId=String(b.accountId||"").trim();
    const sessionToken=String(b.sessionToken||"");
    const code=String(b.code||"").trim().toUpperCase();
    const fare=Math.max(0,Number(b.fare||0));
    if(!accountId||!sessionToken||!code) return json({error:"Promosyon bilgisi eksik"},400);
    if(!(await verifyCustomerSession(accountId,sessionToken))) return json({error:"Oturum geçersiz"},401);
    const now=new Date().toISOString();
    const {data:p,error}=await db.from("rota2_promo_codes").select("*").eq("code",code).eq("active",true).maybeSingle();
    if(error) return json({error:error.message},500);
    if(!p) return json({error:"Promosyon kodu geçersiz"},404);
    if(p.starts_at && p.starts_at>now) return json({error:"Promosyon henüz başlamadı"},409);
    if(p.ends_at && p.ends_at<now) return json({error:"Promosyon süresi doldu"},409);
    if(p.max_uses && Number(p.used_count||0)>=Number(p.max_uses)) return json({error:"Promosyon kullanım limiti doldu"},409);
    const discountPercent=Number(p.discount_percent||0);
    const discountAmount=Number((fare*discountPercent/100).toFixed(2));
    return json({ok:true,code,discountPercent,discountAmount,finalFare:Number(Math.max(0,fare-discountAmount).toFixed(2))});
  }

  if (action === "join-corporate-account") {
    const accountId=String(b.accountId||"").trim();
    const sessionToken=String(b.sessionToken||"");
    const joinCode=String(b.joinCode||"").trim().toUpperCase();
    if(!accountId||!sessionToken||!joinCode) return json({error:"Kurumsal hesap bilgisi eksik"},400);
    if(!(await verifyCustomerSession(accountId,sessionToken))) return json({error:"Oturum geçersiz"},401);
    const {data:corp,error}=await db.from("rota2_corporate_accounts").select("corporate_id,name,active").eq("join_code",joinCode).eq("active",true).maybeSingle();
    if(error) return json({error:error.message},500);
    if(!corp) return json({error:"Kurumsal katılım kodu geçersiz"},404);
    const {error:me}=await db.from("rota2_corporate_members").upsert({corporate_id:corp.corporate_id,account_id:accountId,active:true},{onConflict:"corporate_id,account_id"});
    if(me) return json({error:me.message},500);
    await db.from("rota2_customer_settings").upsert({account_id:accountId,corporate_id:corp.corporate_id,updated_at:new Date().toISOString()},{onConflict:"account_id"});
    return json({ok:true,corporate:{id:corp.corporate_id,name:corp.name}});
  }

  if (action === "customer-driver-card") {
    const accountId=String(b.accountId||"").trim();
    const sessionToken=String(b.sessionToken||"");
    const tripId=String(b.tripId||"").trim();
    if(!accountId||!sessionToken||!tripId) return json({error:"Bilgi eksik"},400);
    if(!(await verifyCustomerSession(accountId,sessionToken))) return json({error:"Oturum geçersiz"},401);
    const {data:trip,error:te}=await db.from("rota2_trips").select("driver_id,status,customer_account_id").eq("trip_id",tripId).eq("customer_account_id",accountId).maybeSingle();
    if(te) return json({error:te.message},500);
    if(!trip||!trip.driver_id||!["accepted","completed"].includes(trip.status)) return json({error:"Sürücü henüz atanmadı"},409);
    const [{data:a},{data:v},{data:d},{data:ratings}]=await Promise.all([
      db.from("rota2_accounts").select("first_name,last_name").eq("role","driver").eq("driver_id",trip.driver_id).maybeSingle(),
      db.from("rota2_driver_profiles").select("vehicle_plate,vehicle_model,profile_photo_path,documents_complete").eq("driver_id",trip.driver_id).maybeSingle(),
      db.from("rota2_drivers").select("vehicle").eq("driver_id",trip.driver_id).maybeSingle(),
      db.from("rota2_trips").select("customer_rating").eq("driver_id",trip.driver_id).eq("status","completed").not("customer_rating","is",null).limit(100)
    ]);
    const vals=(ratings||[]).map((x:any)=>Number(x.customer_rating)).filter((x:number)=>Number.isFinite(x));
    const rating=vals.length?Number((vals.reduce((a:number,b:number)=>a+b,0)/vals.length).toFixed(2)):null;
    return json({ok:true,driver:{
      driverId:trip.driver_id,
      name:((a?.first_name||"")+" "+(a?.last_name||"")).trim()||"ROTA Sürücü",
      plate:v?.vehicle_plate||"",
      vehicleModel:v?.vehicle_model||"",
      vehicle:d?.vehicle||"Normal Araç",
      rating,
      documentsVerified:!!v?.documents_complete,
      profilePhotoPath:v?.profile_photo_path||null
    }});
  }

  if (action === "trip-summary") {
    const accountId=String(b.accountId||"").trim();
    const sessionToken=String(b.sessionToken||"");
    const tripId=String(b.tripId||"").trim();
    if(!accountId||!sessionToken||!tripId) return json({error:"Bilgi eksik"},400);
    if(!(await verifyCustomerSession(accountId,sessionToken))) return json({error:"Oturum geçersiz"},401);
    const {data,error}=await db.from("rota2_trips")
      .select("trip_id,driver_id,destination,distance_km,fare,vehicle,status,created_at,updated_at,payment_method,promo_code,discount_amount,customer_rating")
      .eq("trip_id",tripId).eq("customer_account_id",accountId).maybeSingle();
    if(error) return json({error:error.message},500);
    if(!data) return json({error:"Yolculuk bulunamadı"},404);
    return json({ok:true,summary:data});
  }

  if (action === "trip-feedback") {
    const accountId=String(b.accountId||"").trim();
    const sessionToken=String(b.sessionToken||"");
    const tripId=String(b.tripId||"").trim();
    const rating=Number(b.rating);
    const tags=Array.isArray(b.tags)?b.tags.map((x:any)=>String(x).slice(0,40)).slice(0,8):[];
    const note=String(b.note||"").trim().slice(0,500)||null;
    if(!accountId||!sessionToken||!tripId||!Number.isInteger(rating)||rating<1||rating>5) return json({error:"Puan bilgisi geçersiz"},400);
    if(!(await verifyCustomerSession(accountId,sessionToken))) return json({error:"Oturum geçersiz"},401);
    const {data:trip,error:te}=await db.from("rota2_trips").select("trip_id,status,customer_account_id").eq("trip_id",tripId).eq("customer_account_id",accountId).maybeSingle();
    if(te) return json({error:te.message},500);
    if(!trip||trip.status!=="completed") return json({error:"Yolculuk tamamlanmadan değerlendirme yapılamaz"},409);
    const now=new Date().toISOString();
    const {error:ue}=await db.from("rota2_trips").update({customer_rating:rating,customer_rated_at:now}).eq("trip_id",tripId).eq("customer_account_id",accountId);
    if(ue) return json({error:ue.message},500);
    const {error:fe}=await db.from("rota2_trip_feedback").upsert({trip_id:tripId,account_id:accountId,rating,tags,note},{onConflict:"trip_id"});
    if(fe) return json({error:fe.message},500);
    return json({ok:true});
  }

  if (action === "trip-share-create") {
    const accountId=String(b.accountId||"").trim();
    const sessionToken=String(b.sessionToken||"");
    const tripId=String(b.tripId||"").trim();
    if(!accountId||!sessionToken||!tripId) return json({error:"Bilgi eksik"},400);
    if(!(await verifyCustomerSession(accountId,sessionToken))) return json({error:"Oturum geçersiz"},401);
    const {data:trip,error:te}=await db.from("rota2_trips").select("trip_id,status,customer_account_id").eq("trip_id",tripId).eq("customer_account_id",accountId).maybeSingle();
    if(te) return json({error:te.message},500);
    if(!trip||!["accepted","completed"].includes(trip.status)) return json({error:"Aktif veya tamamlanmış yolculuk bulunamadı"},409);
    const {data,error}=await db.from("rota2_trip_share_tokens").insert({trip_id:tripId,account_id:accountId}).select("token,expires_at").single();
    if(error) return json({error:error.message},500);
    return json({ok:true,token:data.token,expiresAt:data.expires_at,shareUrl:"https://ftltemgtzkjfnkxsxxmd.supabase.co/functions/v1/rota-trip-share?token="+data.token});
  }

  if (action === "trip-share-public") {
    const token=String(u.searchParams.get("token")||b.token||"").trim();
    if(!token) return json({error:"Paylaşım bağlantısı geçersiz"},400);
    const {data:share,error:se}=await db.from("rota2_trip_share_tokens").select("trip_id,expires_at,revoked_at").eq("token",token).maybeSingle();
    if(se) return json({error:se.message},500);
    if(!share||share.revoked_at||new Date(share.expires_at).getTime()<Date.now()) return json({error:"Paylaşım bağlantısının süresi dolmuş"},410);
    const {data:trip,error:te}=await db.from("rota2_trips").select("trip_id,driver_id,status,destination,pickup_lat,pickup_lng,destination_lat,destination_lng").eq("trip_id",share.trip_id).maybeSingle();
    if(te) return json({error:te.message},500);
    if(!trip) return json({error:"Yolculuk bulunamadı"},404);
    let driverLocation=null;
    if(trip.driver_id){
      const {data:d}=await db.from("rota2_drivers").select("lat,lng,updated_at").eq("driver_id",trip.driver_id).maybeSingle();
      if(d) driverLocation={lat:Number(d.lat),lng:Number(d.lng),updatedAt:d.updated_at};
    }
    return json({ok:true,trip:{status:trip.status,destination:trip.destination,pickup:{lat:Number(trip.pickup_lat),lng:Number(trip.pickup_lng)},destinationLocation:{lat:Number(trip.destination_lat),lng:Number(trip.destination_lng)},driverLocation}});
  }

  if (action === "customer-trips") {
    const accountId=String(b.accountId||"").trim();
    const sessionToken=String(b.sessionToken||"");
    if(!accountId || !sessionToken) return json({error:"Oturum bilgisi eksik"},400);
    if(!(await verifyCustomerSession(accountId,sessionToken))) return json({error:"Oturum geçersiz. Tekrar giriş yapın."},401);
    const {data,error}=await db.from("rota2_trips")
      .select("trip_id,driver_id,destination,distance_km,fare,vehicle,status,created_at,updated_at,customer_rating,pickup_verified_at")
      .eq("customer_account_id",accountId)
      .order("created_at",{ascending:false})
      .limit(50);
    if(error) return json({error:error.message},500);
    const trips=(data||[]).map((t:any)=>t.status==="completed"||t.status==="cancelled"
      ? {...t,pickup_verified_at:null}
      : t);
    return json({ok:true,trips});
  }

  if (action === "create-reservation") {
    const accountId=String(b.accountId||"").trim();
    const sessionToken=String(b.sessionToken||"");
    if(!accountId || !sessionToken) return json({error:"Oturum bilgisi eksik"},400);
    if(!(await verifyCustomerSession(accountId,sessionToken))) return json({error:"Oturum geçersiz. Tekrar giriş yapın."},401);

    const pickup=b.pickup||{}, target=b.target||{};
    const pickupLabel=String(b.pickupLabel||pickup.label||"").trim();
    const destination=String(b.destination||target.label||"").trim();
    const pLat=Number(pickup.lat), pLng=Number(pickup.lng), tLat=Number(target.lat), tLng=Number(target.lng);
    const vehicle=String(b.vehicle||"Normal Araç").trim();
    const scheduledAt=new Date(String(b.scheduledAt||""));

    if(!pickupLabel || !destination || ![pLat,pLng,tLat,tLng].every(Number.isFinite)) return json({error:"Alınma ve varış konumu eksik"},400);
    if(!Number.isFinite(scheduledAt.getTime())) return json({error:"Rezervasyon tarih/saat bilgisi geçersiz"},400);
    if(scheduledAt.getTime() < Date.now()+10*60*1000) return json({error:"Rezervasyon en az 10 dakika sonrası için oluşturulabilir"},400);
    if(scheduledAt.getTime() > Date.now()+180*24*60*60*1000) return json({error:"Rezervasyon en fazla 180 gün sonrası için oluşturulabilir"},400);

    const {data,error}=await db.from("rota2_reservations").insert({
      customer_account_id:accountId,
      pickup_label:pickupLabel,
      pickup_lat:pLat,pickup_lng:pLng,
      destination,
      destination_lat:tLat,destination_lng:tLng,
      vehicle,
      scheduled_at:scheduledAt.toISOString(),
      status:"open"
    }).select("reservation_id,pickup_label,destination,vehicle,scheduled_at,status,created_at").single();
    if(error) return json({error:error.message},500);
    return json({ok:true,reservation:data});
  }

  if (action === "customer-reservations") {
    const accountId=String(b.accountId||"").trim();
    const sessionToken=String(b.sessionToken||"");
    if(!accountId || !sessionToken) return json({error:"Oturum bilgisi eksik"},400);
    if(!(await verifyCustomerSession(accountId,sessionToken))) return json({error:"Oturum geçersiz. Tekrar giriş yapın."},401);
    const {data,error}=await db.from("rota2_reservations")
      .select("reservation_id,driver_id,pickup_label,destination,vehicle,scheduled_at,status,created_at,updated_at")
      .eq("customer_account_id",accountId)
      .order("scheduled_at",{ascending:false})
      .limit(50);
    if(error) return json({error:error.message},500);
    return json({ok:true,reservations:data||[]});
  }

  if (action === "driver-demand-zones") {
    const driverId=String(b.driverId||"").trim();
    const sessionToken=String(b.sessionToken||"");
    if(!driverId||!sessionToken) return json({error:"Sürücü oturumu eksik"},400);
    if(!(await verifyDriverSession(driverId,sessionToken))) return json({error:"Sürücü oturumu geçersiz"},401);
    const since=new Date(Date.now()-6*60*60*1000).toISOString();
    const {data,error}=await db.from("rota2_trips")
      .select("pickup_lat,pickup_lng,created_at,status")
      .gte("created_at",since)
      .in("status",["assigned","accepted","completed","cancelled"])
      .limit(500);
    if(error) return json({error:error.message},500);
    const zones=new Map<string,any>();
    for(const t of (data||[])){
      const lat=Number(t.pickup_lat),lng=Number(t.pickup_lng);
      if(!Number.isFinite(lat)||!Number.isFinite(lng)) continue;
      const glat=Math.round(lat*100)/100,glng=Math.round(lng*100)/100;
      const key=glat.toFixed(2)+","+glng.toFixed(2);
      const z=zones.get(key)||{lat:glat,lng:glng,count:0,active:0};
      z.count++;
      if(t.status==="assigned"||t.status==="accepted") z.active++;
      zones.set(key,z);
    }
    const rows=[...zones.values()].sort((a:any,b:any)=>(b.count+b.active*2)-(a.count+a.active*2)).slice(0,30);
    const max=Math.max(1,...rows.map((x:any)=>x.count+x.active*2));
    return json({ok:true,windowHours:6,zones:rows.map((x:any)=>({...x,intensity:Number(((x.count+x.active*2)/max).toFixed(2))}))});
  }

  if (action === "driver-reservations") {
    const driverId=String(b.driverId||"").trim();
    const sessionToken=String(b.sessionToken||"");
    if(!driverId || !sessionToken) return json({error:"Sürücü oturumu eksik"},400);
    if(!(await verifyDriverSession(driverId,sessionToken))) return json({error:"Sürücü oturumu geçersiz"},401);

    const now=new Date().toISOString();
    const future=new Date(Date.now()+180*24*60*60*1000).toISOString();
    const {data,error}=await db.from("rota2_reservations")
      .select("reservation_id,pickup_label,pickup_lat,pickup_lng,destination,destination_lat,destination_lng,vehicle,scheduled_at,status,created_at")
      .eq("status","open")
      .gte("scheduled_at",now)
      .lte("scheduled_at",future)
      .order("scheduled_at",{ascending:true})
      .limit(200);
    if(error) return json({error:error.message},500);

    return json({
      ok:true,
      reservations:data||[],
      scope:"istanbul",
      allDrivers:true
    });
  }

  if (action === "accept-reservation") {
    const driverId=String(b.driverId||"").trim();
    const sessionToken=String(b.sessionToken||"");
    const reservationId=String(b.reservationId||"").trim();
    if(!driverId || !sessionToken || !reservationId) return json({error:"Rezervasyon bilgisi eksik"},400);
    if(!(await verifyDriverSession(driverId,sessionToken))) return json({error:"Sürücü oturumu geçersiz"},401);

    const {data,error}=await db.from("rota2_reservations")
      .update({driver_id:driverId,status:"accepted",updated_at:new Date().toISOString()})
      .eq("reservation_id",reservationId)
      .eq("status","open")
      .select("reservation_id,pickup_label,destination,vehicle,scheduled_at,status,driver_id")
      .maybeSingle();
    if(error) return json({error:error.message},500);
    if(!data) return json({error:"Rezervasyon başka bir sürücü tarafından alınmış veya artık açık değil"},409);
    return json({ok:true,reservation:data});
  }


  async function authorizeTripChat(role:string, tripId:string, accountId:string, driverId:string, sessionToken:string){
    if(!tripId || !sessionToken) return {ok:false,status:400,error:"Yolculuk veya oturum bilgisi eksik"};
    const {data:trip,error}=await db.from("rota2_trips")
      .select("trip_id,status,customer_account_id,driver_id")
      .eq("trip_id",tripId)
      .maybeSingle();
    if(error) return {ok:false,status:500,error:error.message};
    if(!trip) return {ok:false,status:404,error:"Yolculuk bulunamadı"};
    if(trip.status!=="accepted") return {ok:false,status:403,error:"Mesajlaşma yalnızca aktif eşleşmede kullanılabilir"};

    if(role==="customer"){
      if(!accountId || !(await verifyCustomerSession(accountId,sessionToken)))
        return {ok:false,status:401,error:"Müşteri oturumu geçersiz"};
      if(trip.customer_account_id!==accountId)
        return {ok:false,status:403,error:"Bu yolculuğa erişiminiz yok"};
      return {ok:true,trip};
    }

    if(role==="driver"){
      if(!driverId || !(await verifyDriverSession(driverId,sessionToken)))
        return {ok:false,status:401,error:"Sürücü oturumu geçersiz"};
      if(trip.driver_id!==driverId)
        return {ok:false,status:403,error:"Bu yolculuğa erişiminiz yok"};
      return {ok:true,trip};
    }

    return {ok:false,status:400,error:"Geçersiz kullanıcı rolü"};
  }

  if (action === "trip-chat-list") {
    const role=String(b.role||"");
    const tripId=String(b.tripId||"").trim();
    const accountId=String(b.accountId||"").trim();
    const driverId=String(b.driverId||"").trim();
    const sessionToken=String(b.sessionToken||"");
    const auth:any=await authorizeTripChat(role,tripId,accountId,driverId,sessionToken);
    if(!auth.ok) return json({error:auth.error},auth.status);

    const {data,error}=await db.from("rota2_trip_messages")
      .select("message_id,sender_role,body,created_at")
      .eq("trip_id",tripId)
      .order("created_at",{ascending:true})
      .limit(100);
    if(error) return json({error:error.message},500);
    return json({ok:true,messages:data||[]});
  }

  if (action === "trip-chat-send") {
    const role=String(b.role||"");
    const tripId=String(b.tripId||"").trim();
    const accountId=String(b.accountId||"").trim();
    const driverId=String(b.driverId||"").trim();
    const sessionToken=String(b.sessionToken||"");
    const body=String(b.message||"").trim().slice(0,500);
    if(!body) return json({error:"Mesaj boş olamaz"},400);

    const auth:any=await authorizeTripChat(role,tripId,accountId,driverId,sessionToken);
    if(!auth.ok) return json({error:auth.error},auth.status);

    const {data,error}=await db.from("rota2_trip_messages").insert({
      trip_id:tripId,
      sender_role:role,
      sender_account_id:role==="customer"?accountId:null,
      sender_driver_id:role==="driver"?driverId:null,
      body
    }).select("message_id,sender_role,body,created_at").single();
    if(error) return json({error:error.message},500);
    return json({ok:true,message:data});
  }


  if (action === "admin-stats") {
    const [
      customers,
      drivers,
      onlineDrivers,
      busyDrivers,
      activeTrips,
      completedTrips,
      cancelledTrips,
      allTrips
    ] = await Promise.all([
      db.from("rota2_accounts").select("account_id",{count:"exact",head:true}).eq("role","customer"),
      db.from("rota2_accounts").select("account_id",{count:"exact",head:true}).eq("role","driver"),
      db.from("rota2_drivers").select("driver_id",{count:"exact",head:true}).eq("online",true),
      db.from("rota2_drivers").select("driver_id",{count:"exact",head:true}).eq("busy",true),
      db.from("rota2_trips").select("trip_id",{count:"exact",head:true}).eq("status","accepted"),
      db.from("rota2_trips").select("trip_id",{count:"exact",head:true}).eq("status","completed"),
      db.from("rota2_trips").select("trip_id",{count:"exact",head:true}).eq("status","cancelled"),
      db.from("rota2_trips").select("trip_id",{count:"exact",head:true})
    ]);

    const errors=[customers,drivers,onlineDrivers,busyDrivers,activeTrips,completedTrips,cancelledTrips,allTrips]
      .map((x:any)=>x.error).filter(Boolean);
    if(errors.length) return json({error:errors[0].message||"İstatistikler alınamadı"},500);

    return json({
      ok:true,
      updatedAt:new Date().toISOString(),
      stats:{
        customers:customers.count||0,
        drivers:drivers.count||0,
        onlineDrivers:onlineDrivers.count||0,
        busyDrivers:busyDrivers.count||0,
        activeTrips:activeTrips.count||0,
        completedTrips:completedTrips.count||0,
        cancelledTrips:cancelledTrips.count||0,
        totalTrips:allTrips.count||0
      }
    });
  }

  if (action === "customer-trip-code") {
    const tripId=String(b.tripId||"").trim();
    const accountId=String(b.accountId||"").trim();
    const sessionToken=String(b.sessionToken||"");
    if(!tripId || !accountId || !sessionToken) return json({error:"Yolculuk veya oturum bilgisi eksik"},400);
    if(!(await verifyCustomerSession(accountId,sessionToken))) return json({error:"Müşteri oturumu geçersiz"},401);
    const {data,error}=await db.from("rota2_trips")
      .select("trip_id,driver_id,status,pickup_code,pickup_verified_at,customer_rating,customer_account_id,pickup_lat,pickup_lng,destination,destination_lat,destination_lng")
      .eq("trip_id",tripId)
      .eq("customer_account_id",accountId)
      .maybeSingle();
    if(error) return json({error:error.message},500);
    if(!data) return json({error:"Yolculuk bulunamadı"},404);
    let driverLocation:any=null;
    let etaMinutes:number|null=null;
    if((data.status==="accepted"||data.status==="completed") && data.driver_id){
      const {data:driver}=await db.from("rota2_drivers")
        .select("lat,lng,online,updated_at")
        .eq("driver_id",data.driver_id)
        .maybeSingle();
      if(driver && Number.isFinite(Number(driver.lat)) && Number.isFinite(Number(driver.lng))){
        const distanceKm=hav(Number(driver.lat),Number(driver.lng),Number(data.pickup_lat),Number(data.pickup_lng));
        driverLocation={
          lat:Number(driver.lat),
          lng:Number(driver.lng),
          updatedAt:driver.updated_at,
          online:!!driver.online,
          distanceKm:Number(distanceKm.toFixed(2))
        };
        etaMinutes=Math.max(1,Math.round(distanceKm/0.45));
      }
    }
    return json({
      ok:true,
      tripId:data.trip_id,
      driverId:data.status==="accepted"||data.status==="completed"?data.driver_id:null,
      status:data.status,
      pickupCode:data.status==="accepted"||data.status==="completed" ? (data.pickup_code||null) : null,
      verified:!!data.pickup_verified_at,
      rating:data.customer_rating||null,
      driverLocation,
      pickupLocation:{
        lat:Number(data.pickup_lat),
        lng:Number(data.pickup_lng)
      },
      destinationLocation:{
        label:String(data.destination||"Hedef"),
        lat:Number(data.destination_lat),
        lng:Number(data.destination_lng)
      },
      etaMinutes
    });
  }

  if (action === "rate-trip") {
    const tripId=String(b.tripId||"").trim();
    const accountId=String(b.accountId||"").trim();
    const sessionToken=String(b.sessionToken||"");
    const rating=Number(b.rating);
    if(!tripId || !accountId || !sessionToken || !Number.isInteger(rating) || rating<1 || rating>5) return json({error:"Puan bilgisi geçersiz"},400);
    if(!(await verifyCustomerSession(accountId,sessionToken))) return json({error:"Oturum geçersiz. Tekrar giriş yapın."},401);
    const {data:trip,error}=await db.from("rota2_trips").select("trip_id,status,customer_account_id,customer_rating,driver_id").eq("trip_id",tripId).maybeSingle();
    if(error) return json({error:error.message},500);
    if(!trip) return json({error:"Yolculuk bulunamadı"},404);
    if(trip.status!=="completed") return json({error:"Yolculuk tamamlanmadan puan verilemez"},409);
    if(!trip.customer_account_id || trip.customer_account_id!==accountId) return json({error:"Bu yolculuğu puanlama yetkiniz yok"},403);
    if(trip.customer_rating) return json({error:"Bu yolculuk daha önce puanlandı"},409);
    const now=new Date().toISOString();
    const {error:ue}=await db.from("rota2_trips").update({customer_rating:rating,customer_rated_at:now,updated_at:now}).eq("trip_id",tripId);
    if(ue) return json({error:ue.message},500);
    return json({ok:true,driverId:trip.driver_id,rating});
  }

  if (action === "save-driver-payment-profile") {
    const driverId=String(b.driverId||"").trim();
    const sessionToken=String(b.sessionToken||"");
    const firstName=String(b.firstName||"").trim();
    const lastName=String(b.lastName||"").trim();
    const iban=normalizeIban(String(b.iban||""));
    if(!driverId || !sessionToken) return json({error:"Sürücü oturumu eksik"},400);
    if(!(await verifyDriverSession(driverId,sessionToken))) return json({error:"Sürücü oturumu geçersiz"},401);
    if(firstName.length<2 || lastName.length<2) return json({error:"Ad ve soyad zorunludur"},400);
    if(!validTrIban(iban)) return json({error:"Geçerli bir Türkiye IBAN'ı girin"},400);

    const now=new Date().toISOString();
    const {error}=await db.from("rota2_driver_payment_profiles").upsert({
      driver_id:driverId,
      first_name:firstName,
      last_name:lastName,
      iban_enc:await encryptIban(iban),
      iban_last4:iban.slice(-4),
      updated_at:now
    },{onConflict:"driver_id"});
    if(error) return json({error:error.message},500);

    await db.from("rota2_accounts").update({first_name:firstName,last_name:lastName}).eq("driver_id",driverId).eq("role","driver");
    return json({ok:true,profile:{firstName,lastName,ibanMasked:"TR••••••••••••••••••••"+iban.slice(-4)}});
  }

  if (action === "driver-payment-profile") {
    const driverId=String(b.driverId||"").trim();
    const sessionToken=String(b.sessionToken||"");
    if(!driverId || !sessionToken) return json({error:"Sürücü oturumu eksik"},400);
    if(!(await verifyDriverSession(driverId,sessionToken))) return json({error:"Sürücü oturumu geçersiz"},401);
    const {data,error}=await db.from("rota2_driver_payment_profiles")
      .select("first_name,last_name,iban_enc,iban_last4,updated_at")
      .eq("driver_id",driverId)
      .maybeSingle();
    if(error) return json({error:error.message},500);
    if(!data) return json({ok:true,profile:null});
    const iban=await decryptIban(data.iban_enc);
    return json({ok:true,profile:{
      firstName:data.first_name,
      lastName:data.last_name,
      iban:iban||"",
      ibanMasked:iban?iban.slice(0,4)+" •••• •••• •••• •••• ••"+iban.slice(-4):"",
      updatedAt:data.updated_at
    }});
  }

  if (action === "customer-trip-payment") {
    const accountId=String(b.accountId||"").trim();
    const sessionToken=String(b.sessionToken||"");
    const tripId=String(b.tripId||"").trim();
    if(!accountId || !sessionToken || !tripId) return json({error:"Ödeme bilgisi için oturum/yolculuk eksik"},400);
    if(!(await verifyCustomerSession(accountId,sessionToken))) return json({error:"Müşteri oturumu geçersiz"},401);

    const {data:trip,error:te}=await db.from("rota2_trips")
      .select("trip_id,driver_id,customer_account_id,status,pickup_verified_at,fare")
      .eq("trip_id",tripId)
      .eq("customer_account_id",accountId)
      .maybeSingle();
    if(te) return json({error:te.message},500);
    if(!trip) return json({error:"Yolculuk bulunamadı"},404);
    if(!trip.pickup_verified_at || trip.status!=="accepted")
      return json({error:"Ödeme bilgileri yalnızca aktif yolculuk sırasında gösterilir"},403);

    const {data:pay,error:pe}=await db.from("rota2_driver_payment_profiles")
      .select("first_name,last_name,iban_enc")
      .eq("driver_id",trip.driver_id)
      .maybeSingle();
    if(pe) return json({error:pe.message},500);
    if(!pay) return json({error:"Sürücü henüz ödeme bilgilerini eklememiş"},404);
    const iban=await decryptIban(pay.iban_enc);
    if(!iban) return json({error:"IBAN bilgisi okunamadı"},500);
    return json({ok:true,payment:{
      driverName:(pay.first_name+" "+pay.last_name).trim(),
      iban,
      fare:Number(trip.fare||0)
    }});
  }

  if (action === "driver-dashboard") {
    const driverId=String(b.driverId||"").trim();
    const sessionToken=String(b.sessionToken||"");
    if(!driverId || !sessionToken) return json({error:"Sürücü oturumu eksik"},400);
    if(!(await verifyDriverSession(driverId,sessionToken))) return json({error:"Sürücü oturumu geçersiz"},401);

    const [{data:trips,error:te},{data:ver,error:ve},{data:drv,error:de}] = await Promise.all([
      db.from("rota2_trips")
        .select("trip_id,destination,distance_km,fare,vehicle,status,created_at,updated_at,customer_rating")
        .eq("driver_id",driverId)
        .eq("status","completed")
        .order("created_at",{ascending:false})
        .limit(100),
      db.from("rota2_driver_verification")
        .select("vehicle_plate,credential_class,credential_last4,identity_last4,complete,updated_at")
        .eq("driver_id",driverId)
        .maybeSingle(),
      db.from("rota2_drivers")
        .select("vehicle,online,busy,updated_at")
        .eq("driver_id",driverId)
        .maybeSingle()
    ]);
    if(te) return json({error:te.message},500);
    if(ve) return json({error:ve.message},500);
    if(de) return json({error:de.message},500);

    const rows=trips||[];
    const totalFare=rows.reduce((sum:any,t:any)=>sum+Number(t.fare||0),0);
    const totalKm=rows.reduce((sum:any,t:any)=>sum+Number(t.distance_km||0),0);
    return json({
      ok:true,
      stats:{customerCount:rows.length,totalFare,totalKm},
      trips:rows,
      vehicle:{
        vehicleType:drv?.vehicle||null,
        plate:ver?.vehicle_plate||null,
        licenseClass:ver?.credential_class||null,
        licenseLast4:ver?.credential_last4||null,
        identityLast4:ver?.identity_last4||null,
        documentsComplete:!!ver?.complete,
        online:!!drv?.online,
        busy:!!drv?.busy,
        updatedAt:ver?.updated_at||drv?.updated_at||null
      }
    });
  }

  if (action === "driver-documents") {
    const driverId=String(b.driverId||"").trim();
    const sessionToken=String(b.sessionToken||"");
    if(!driverId || !sessionToken) return json({error:"Sürücü oturumu eksik"},400);
    if(!(await verifyDriverSession(driverId,sessionToken))) return json({error:"Sürücü oturumu geçersiz"},401);

    const {data:ver,error}=await db.from("rota2_driver_verification")
      .select("doc_a_path,doc_b_path,doc_c_path,complete,vehicle_plate,credential_class")
      .eq("driver_id",driverId)
      .maybeSingle();
    if(error) return json({error:error.message},500);
    if(!ver) return json({error:"Belge kaydı bulunamadı"},404);

    const paths=[
      {key:"vehicle",label:"Araç Fotoğrafı",path:ver.doc_a_path},
      {key:"criminal",label:"Adli Sicil Kaydı",path:ver.doc_b_path},
      {key:"residence",label:"İkamet Adresi Belgesi",path:ver.doc_c_path}
    ];
    const documents:any[]=[];
    for(const x of paths){
      if(!x.path){documents.push({...x,url:null});continue;}
      const {data:signed,error:se}=await db.storage.from("rota-driver-documents").createSignedUrl(x.path,300);
      documents.push({...x,url:se?null:(signed?.signedUrl||null),error:se?.message||null});
    }
    return json({ok:true,complete:!!ver.complete,plate:ver.vehicle_plate,licenseClass:ver.credential_class,documents});
  }

  if (action === "driver-trips") {
    const driverId=String(b.driverId||"").trim();
    const sessionToken=String(b.sessionToken||"");
    if(!driverId || !sessionToken) return json({error:"Sürücü oturumu eksik"},400);
    if(!(await verifyDriverSession(driverId,sessionToken))) return json({error:"Sürücü oturumu geçersiz"},401);

    const nowIso=new Date().toISOString();
    const {data:expiredOffers}=await db.from("rota2_trip_candidates")
      .select("trip_id,driver_id,offer_order,offer_expires_at")
      .eq("status","pending")
      .lte("offer_expires_at",nowIso)
      .limit(50);

    for(const off of (expiredOffers||[])){
      const {data:trip}=await db.from("rota2_trips")
        .select("trip_id,status")
        .eq("trip_id",off.trip_id)
        .maybeSingle();
      if(!trip || trip.status!=="assigned") continue;

      const {data:expired}=await db.from("rota2_trip_candidates")
        .update({status:"expired",updated_at:nowIso})
        .eq("trip_id",off.trip_id)
        .eq("driver_id",off.driver_id)
        .eq("status","pending")
        .lte("offer_expires_at",nowIso)
        .select("trip_id")
        .maybeSingle();
      if(!expired) continue;

      const {data:next}=await db.from("rota2_trip_candidates")
        .select("trip_id,driver_id,offer_order")
        .eq("trip_id",off.trip_id)
        .eq("status","queued")
        .order("offer_order",{ascending:true})
        .limit(1)
        .maybeSingle();

      if(next){
        const started=new Date();
        const expires=new Date(started.getTime()+15_000).toISOString();
        await db.from("rota2_trip_candidates")
          .update({
            status:"pending",
            offer_started_at:started.toISOString(),
            offer_expires_at:expires,
            updated_at:started.toISOString()
          })
          .eq("trip_id",next.trip_id)
          .eq("driver_id",next.driver_id)
          .eq("status","queued");
        await db.from("rota2_trips")
          .update({driver_id:next.driver_id,updated_at:started.toISOString()})
          .eq("trip_id",next.trip_id)
          .eq("status","assigned");
      }else{
        await db.from("rota2_trips")
          .update({status:"cancelled",updated_at:nowIso})
          .eq("trip_id",off.trip_id)
          .eq("status","assigned");
      }
    }

    const {data:cands,error:ce}=await db.from("rota2_trip_candidates")
      .select("trip_id,distance_km,status,created_at,offer_order,offer_started_at,offer_expires_at")
      .eq("driver_id",driverId)
      .in("status",["pending","accepted"])
      .order("created_at",{ascending:false})
      .limit(30);
    if(ce) return json({error:ce.message},500);

    const ids=[...new Set((cands||[]).map((x:any)=>x.trip_id))];
    if(!ids.length) return json({ok:true,trips:[]});

    const {data,error}=await db.from("rota2_trips")
      .select("*")
      .in("trip_id",ids)
      .in("status",["assigned","accepted"])
      .order("created_at",{ascending:false})
      .limit(30);
    if(error) return json({error:error.message},500);

    const candMap=new Map((cands||[]).map((x:any)=>[x.trip_id,x]));
    const trips=(data||[]).map((t:any)=>{
      const c:any=candMap.get(t.trip_id);
      const owned=t.status==="accepted" && t.driver_id===driverId;
      if(!owned){
        const {pickup_code_hash,pickup_code,destination,destination_lat,destination_lng,...rest}=t;
        const msLeft=Math.max(0,new Date(c?.offer_expires_at||0).getTime()-Date.now());
        return {
          ...rest,
          driver_id:null,
          pickupVerified:false,
          destination:"Kabul sonrası gösterilecek",
          destination_lat:null,
          destination_lng:null,
          candidateDistanceKm:Number(c?.distance_km||0),
          candidateStatus:c?.status||"pending",
          offerOrder:Number(c?.offer_order||0),
          offerExpiresAt:c?.offer_expires_at||null,
          offerSecondsLeft:Math.ceil(msLeft/1000)
        };
      }
      if(t.pickup_verified_at) return {...t,pickupVerified:true,candidateDistanceKm:Number(c?.distance_km||0),candidateStatus:"accepted",offerExpiresAt:c?.offer_expires_at||null,offerSecondsLeft:0};
      const {pickup_code_hash,destination,destination_lat,destination_lng,...rest}=t;
      return {...rest,pickupVerified:false,destination:"Kod doğrulanmadan gizli",destination_lat:null,destination_lng:null,candidateDistanceKm:Number(c?.distance_km||0),candidateStatus:"accepted",offerExpiresAt:c?.offer_expires_at||null,offerSecondsLeft:0};
    });
    return json({ok:true,trips});
  }

  if (action === "verify-pickup") {
    const tripId=String(b.tripId||"").trim();
    const driverId=String(b.driverId||"").trim();
    const code=String(b.code||"").trim();
    if(!tripId || !driverId || !/^[0-9]{4}$/.test(code)) return json({error:"4 haneli kod gerekli"},400);
    const {data:trip,error}=await db.from("rota2_trips").select("*").eq("trip_id",tripId).eq("driver_id",driverId).maybeSingle();
    if(error) return json({error:error.message},500);
    if(!trip) return json({error:"Yolculuk bulunamadı"},404);
    if(trip.pickup_verified_at) return json({ok:true,alreadyVerified:true,destination:trip.destination,destination_lat:trip.destination_lat,destination_lng:trip.destination_lng});
    if(!trip.pickup_code_hash || await sha256(code)!==trip.pickup_code_hash) return json({error:"Kod yanlış"},400);
    const now=new Date().toISOString();
    const {error:ue}=await db.from("rota2_trips").update({pickup_verified_at:now,updated_at:now}).eq("trip_id",tripId).eq("driver_id",driverId);
    if(ue) return json({error:ue.message},500);
    return json({ok:true,destination:trip.destination,destination_lat:trip.destination_lat,destination_lng:trip.destination_lng});
  }

  if (action === "trip-status") {
    const tripId=String(b.tripId||"");
    const status=String(b.status||"");
    const driverId=String(b.driverId||"").trim();
    const sessionToken=String(b.sessionToken||"");
    if(!tripId || !["accepted","completed","cancelled"].includes(status)) return json({error:"Geçersiz durum"},400);
    if(!driverId || !sessionToken || !(await verifyDriverSession(driverId,sessionToken))) return json({error:"Sürücü oturumu geçersiz"},401);

    if(status==="accepted"){
      const {data:cand,error:ce}=await db.from("rota2_trip_candidates")
        .select("trip_id,driver_id,status,offer_expires_at")
        .eq("trip_id",tripId)
        .eq("driver_id",driverId)
        .eq("status","pending")
        .maybeSingle();
      if(ce) return json({error:ce.message},500);
      if(!cand) return json({error:"Bu yolculuk artık size açık değil"},409);
      if(!cand.offer_expires_at || new Date(cand.offer_expires_at).getTime()<=Date.now()){
        return json({error:"15 saniyelik kabul süresi doldu. Talep sıradaki sürücüye aktarılıyor."},409);
      }

      const {data:trip,error:te}=await db.from("rota2_trips")
        .select("trip_id,status")
        .eq("trip_id",tripId)
        .maybeSingle();
      if(te) return json({error:te.message},500);
      if(!trip || trip.status!=="assigned") return json({error:"Yolculuk başka bir sürücü tarafından alındı"},409);

      const now=new Date().toISOString();
      const {data:accepted,error:ue}=await db.from("rota2_trip_candidates")
        .update({status:"accepted",updated_at:now})
        .eq("trip_id",tripId)
        .eq("driver_id",driverId)
        .eq("status","pending")
        .select("trip_id")
        .maybeSingle();
      if(ue) return json({error:ue.message},409);
      if(!accepted) return json({error:"Yolculuk başka bir sürücü tarafından alındı"},409);

      const {error:tu}=await db.from("rota2_trips")
        .update({driver_id:driverId,status:"accepted",updated_at:now})
        .eq("trip_id",tripId)
        .eq("status","assigned");
      if(tu){
        await db.from("rota2_trip_candidates").update({status:"pending",updated_at:now}).eq("trip_id",tripId).eq("driver_id",driverId);
        return json({error:tu.message},500);
      }

      await db.from("rota2_trip_candidates").update({status:"expired",updated_at:now}).eq("trip_id",tripId).neq("driver_id",driverId).in("status",["pending","queued"]);
      await db.from("rota2_drivers").update({busy:true,updated_at:now}).eq("driver_id",driverId);
      return json({ok:true});
    }

    const {data:owned,error:oe}=await db.from("rota2_trips").select("*").eq("trip_id",tripId).eq("driver_id",driverId).maybeSingle();
    if(oe) return json({error:oe.message},500);
    if(!owned) return json({error:"Bu yolculuk size ait değil"},403);

    if(status==="completed" && !owned.pickup_verified_at) return json({error:"Biniş kodu doğrulanmadan yolculuk tamamlanamaz"},409);

    const now=new Date().toISOString();
    const {error}=await db.from("rota2_trips").update({status,updated_at:now}).eq("trip_id",tripId).eq("driver_id",driverId);
    if(error) return json({error:error.message},500);
    if(status==="completed" || status==="cancelled"){
      await db.from("rota2_drivers").update({busy:false,updated_at:now}).eq("driver_id",driverId);
      await db.from("rota2_trip_candidates").update({status:"expired",updated_at:now}).eq("trip_id",tripId).neq("status","accepted");
    }
    return json({ok:true});
  }







  if(action==="legacy-customer-password-direct"){
    const rawPhone=String(b.phone||"");
    const phone=rawPhone.replace(/\D/g,"");
    const p10=phone10(rawPhone);
    const candidates=Array.from(new Set([
      phone,p10,p10?"0"+p10:"",p10?"90"+p10:"",p10?"+90"+p10:""
    ].filter(Boolean)));
    const firstName=String(b.firstName||"").trim();
    const lastName=String(b.lastName||"").trim();
    const tcNo=String(b.tcNo||"").replace(/\D/g,"");
    const newPassword=String(b.newPassword||"");

    if(p10.length!==10) return json({error:"Geçerli telefon numarası girin"},400);
    if(firstName.length<2 || lastName.length<2) return json({error:"Ad ve soyad zorunludur"},400);
    if(!validTc(tcNo)) return json({error:"T.C. kimlik numarası geçersiz"},400);
    if(newPassword.length<6) return json({error:"Yeni şifre en az 6 karakter olmalı"},400);

    const {data:rows,error}=await db.from("rota2_accounts")
      .select("account_id,first_name,last_name,tc_no_hash")
      .eq("role","customer").in("phone",candidates).limit(2);
    if(error) return json({error:error.message},500);
    const account=(rows||[])[0]||null;
    if(!account) return json({error:"Hesap bilgileri eşleşmedi"},404);

    const norm=(v:any)=>String(v||"").trim().toLocaleLowerCase("tr-TR").replace(/\s+/g," ");
    const tcHash=await sha256(tcNo);
    if(account.tc_no_hash!==tcHash || norm(account.first_name)!==norm(firstName) || norm(account.last_name)!==norm(lastName))
      return json({error:"Hesap bilgileri eşleşmedi"},403);

    const password_hash=await hashPassword(newPassword);
    const {error:up}=await db.from("rota2_accounts").update({
      password_hash,
      session_token_hash:null
    }).eq("account_id",account.account_id).eq("role","customer");
    if(up) return json({error:up.message},500);
    return json({ok:true,passwordChanged:true});
  }

  if(action==="legacy-customer-recovery-start"){
    const rawPhone=String(b.phone||"");
    const phone=rawPhone.replace(/\D/g,"");
    const p10=phone10(rawPhone);
    const candidates=Array.from(new Set([
      phone,p10,p10?"0"+p10:"",p10?"90"+p10:"",p10?"+90"+p10:""
    ].filter(Boolean)));
    const firstName=String(b.firstName||"").trim();
    const lastName=String(b.lastName||"").trim();
    const tcNo=String(b.tcNo||"").replace(/\D/g,"");
    const email=String(b.email||"").trim().toLowerCase();

    if(p10.length!==10) return json({error:"Geçerli telefon numarası girin"},400);
    if(firstName.length<2 || lastName.length<2) return json({error:"Ad ve soyad zorunludur"},400);
    if(!validTc(tcNo)) return json({error:"T.C. kimlik numarası geçersiz"},400);
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({error:"Geçerli e-posta adresi girin"},400);

    const {data:rows,error}=await db.from("rota2_accounts")
      .select("account_id,phone,first_name,last_name,tc_no_hash,email,email_verified_at,email_reset_requested_at")
      .eq("role","customer").in("phone",candidates).limit(2);
    if(error) return json({error:error.message},500);
    const account=(rows||[])[0]||null;
    if(!account) return json({error:"Hesap bilgileri eşleşmedi"},404);

    const norm=(v:any)=>String(v||"").trim().toLocaleLowerCase("tr-TR").replace(/\s+/g," ");
    const tcHash=await sha256(tcNo);
    if(account.tc_no_hash!==tcHash || norm(account.first_name)!==norm(firstName) || norm(account.last_name)!==norm(lastName))
      return json({error:"Hesap bilgileri eşleşmedi"},403);

    const {data:dup}=await db.from("rota2_accounts").select("account_id")
      .ilike("email",email).neq("account_id",account.account_id).maybeSingle();
    if(dup) return json({error:"Bu e-posta başka bir hesapta kayıtlı"},409);

    if(String(account.email||"").toLowerCase()===email && account.email_reset_requested_at){
      const {data:users,error:ue}=await db.auth.admin.listUsers({page:1,perPage:1000});
      if(!ue){
        const user=(users?.users||[]).find((u:any)=>String(u.email||"").toLowerCase()===email);
        if(user){
          const requested=new Date(account.email_reset_requested_at).getTime();
          const confirmed=user.email_confirmed_at ? new Date(user.email_confirmed_at).getTime() : 0;
          const signed=user.last_sign_in_at ? new Date(user.last_sign_in_at).getTime() : 0;
          if(Math.max(confirmed,signed)>=requested){
            await db.from("rota2_accounts").update({
              email_verified_at:new Date().toISOString(),
              email_auth_user_id:user.id
            }).eq("account_id",account.account_id).eq("role","customer");
            return json({ok:true,alreadyConfirmed:true,verificationSent:false,emailMasked:email.replace(/^(.).+(@.+)$/,"$1***$2")});
          }
        }
      }
    }

    const key=publishableKey();
    if(!key) return json({error:"E-posta servisi yapılandırılmamış"},503);
    const rr=await fetch(url+"/auth/v1/otp",{
      method:"POST",
      headers:{apikey:key,"Content-Type":"application/json"},
      body:JSON.stringify({email,create_user:true})
    });
    const jj=await rr.json().catch(()=>({}));
    if(!rr.ok) return json({error:String(jj.msg||jj.message||jj.error_description||jj.error||"E-posta gönderilemedi")},rr.status>=500?503:400);

    const now=new Date().toISOString();
    const {error:up}=await db.from("rota2_accounts").update({
      email,
      email_verified_at:null,
      email_auth_user_id:null,
      email_reset_requested_at:now
    }).eq("account_id",account.account_id).eq("role","customer");
    if(up) return json({error:up.message},500);

    return json({
      ok:true,
      verificationSent:true,
      emailMasked:email.replace(/^(.).+(@.+)$/,"$1***$2")
    });
  }

  if(action==="legacy-customer-recovery-confirm"){
    const rawPhone=String(b.phone||"");
    const phone=rawPhone.replace(/\D/g,"");
    const p10=phone10(rawPhone);
    const candidates=Array.from(new Set([
      phone,p10,p10?"0"+p10:"",p10?"90"+p10:"",p10?"+90"+p10:""
    ].filter(Boolean)));
    const firstName=String(b.firstName||"").trim();
    const lastName=String(b.lastName||"").trim();
    const tcNo=String(b.tcNo||"").replace(/\D/g,"");
    const email=String(b.email||"").trim().toLowerCase();
    const newPassword=String(b.newPassword||"");

    if(p10.length!==10) return json({error:"Geçerli telefon numarası girin"},400);
    if(firstName.length<2 || lastName.length<2) return json({error:"Ad ve soyad zorunludur"},400);
    if(!validTc(tcNo)) return json({error:"T.C. kimlik numarası geçersiz"},400);
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({error:"Geçerli e-posta adresi girin"},400);
    if(newPassword.length<6) return json({error:"Yeni şifre en az 6 karakter olmalı"},400);

    const {data:rows,error}=await db.from("rota2_accounts")
      .select("account_id,first_name,last_name,tc_no_hash,email,email_reset_requested_at")
      .eq("role","customer").in("phone",candidates).limit(2);
    if(error) return json({error:error.message},500);
    const account=(rows||[])[0]||null;
    if(!account) return json({error:"Hesap bilgileri eşleşmedi"},404);

    const norm=(v:any)=>String(v||"").trim().toLocaleLowerCase("tr-TR").replace(/\s+/g," ");
    const tcHash=await sha256(tcNo);
    if(account.tc_no_hash!==tcHash || norm(account.first_name)!==norm(firstName) || norm(account.last_name)!==norm(lastName))
      return json({error:"Hesap bilgileri eşleşmedi"},403);
    if(String(account.email||"").toLowerCase()!==email || !account.email_reset_requested_at)
      return json({error:"E-posta doğrulama isteği bulunamadı"},400);

    const {data:users,error:ue}=await db.auth.admin.listUsers({page:1,perPage:1000});
    if(ue) return json({error:"E-posta doğrulaması kontrol edilemedi"},500);
    const user=(users?.users||[]).find((u:any)=>String(u.email||"").toLowerCase()===email);
    if(!user) return json({error:"E-posta bağlantısı henüz onaylanmamış"},409);

    const requested=new Date(account.email_reset_requested_at).getTime();
    const confirmed=user.email_confirmed_at ? new Date(user.email_confirmed_at).getTime() : 0;
    const signed=user.last_sign_in_at ? new Date(user.last_sign_in_at).getTime() : 0;
    if(Math.max(confirmed,signed) < requested)
      return json({error:"Önce e-postanıza gelen doğrulama bağlantısına dokunun."},409);

    const password_hash=await hashPassword(newPassword);
    const {error:up}=await db.from("rota2_accounts").update({
      email_verified_at:new Date().toISOString(),
      email_auth_user_id:user.id,
      email_reset_requested_at:null,
      password_hash,
      session_token_hash:null
    }).eq("account_id",account.account_id).eq("role","customer");
    if(up) return json({error:up.message},500);

    return json({ok:true,emailVerified:true,passwordChanged:true});
  }

  if(action==="customer-email-start"){
    const accountId=String(b.accountId||"").trim();
    const sessionToken=String(b.sessionToken||"");
    const email=String(b.email||"").trim().toLowerCase();
    if(!accountId || !sessionToken) return json({error:"Oturum bilgisi eksik"},400);
    if(!(await verifyCustomerSession(accountId,sessionToken))) return json({error:"Oturum geçersiz. Tekrar giriş yapın."},401);
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({error:"Geçerli e-posta adresi girin"},400);

    const {data:account,error}=await db.from("rota2_accounts")
      .select("account_id,email,email_verified_at").eq("account_id",accountId).eq("role","customer").maybeSingle();
    if(error) return json({error:error.message},500);
    if(!account) return json({error:"Müşteri hesabı bulunamadı"},404);
    if(String(account.email||"").toLowerCase()===email && account.email_verified_at)
      return json({ok:true,alreadyVerified:true,email});

    const {data:dup}=await db.from("rota2_accounts").select("account_id")
      .ilike("email",email).neq("account_id",accountId).maybeSingle();
    if(dup) return json({error:"Bu e-posta başka bir hesapta kayıtlı"},409);

    const key=publishableKey();
    if(!key) return json({error:"E-posta servisi yapılandırılmamış"},503);
    const rr=await fetch(url+"/auth/v1/otp",{
      method:"POST",
      headers:{apikey:key,"Content-Type":"application/json"},
      body:JSON.stringify({email,create_user:true})
    });
    const jj=await rr.json().catch(()=>({}));
    if(!rr.ok) return json({error:String(jj.msg||jj.message||jj.error_description||jj.error||"E-posta gönderilemedi")},rr.status>=500?503:400);

    const now=new Date().toISOString();
    const {error:ue}=await db.from("rota2_accounts").update({
      email,
      email_verified_at:null,
      email_auth_user_id:null,
      email_reset_requested_at:now
    }).eq("account_id",accountId).eq("role","customer");
    if(ue) return json({error:ue.message},500);
    return json({ok:true,emailSent:true,emailMasked:email.replace(/^(.).+(@.+)$/,"$1***$2")});
  }

  if(action==="customer-email-confirm"){
    const accountId=String(b.accountId||"").trim();
    const sessionToken=String(b.sessionToken||"");
    const email=String(b.email||"").trim().toLowerCase();
    if(!accountId || !sessionToken) return json({error:"Oturum bilgisi eksik"},400);
    if(!(await verifyCustomerSession(accountId,sessionToken))) return json({error:"Oturum geçersiz. Tekrar giriş yapın."},401);

    const {data:account,error}=await db.from("rota2_accounts")
      .select("account_id,email,email_verified_at,email_reset_requested_at")
      .eq("account_id",accountId).eq("role","customer").maybeSingle();
    if(error) return json({error:error.message},500);
    if(!account) return json({error:"Müşteri hesabı bulunamadı"},404);
    if(String(account.email||"").toLowerCase()!==email) return json({error:"E-posta adresi eşleşmedi"},400);
    if(account.email_verified_at) return json({ok:true,alreadyVerified:true,email});
    if(!account.email_reset_requested_at) return json({error:"E-posta doğrulama isteği bulunamadı"},400);

    const {data:users,error:ue}=await db.auth.admin.listUsers({page:1,perPage:1000});
    if(ue) return json({error:"E-posta doğrulaması kontrol edilemedi"},500);
    const user=(users?.users||[]).find((u:any)=>String(u.email||"").toLowerCase()===email);
    if(!user) return json({error:"E-posta bağlantısı henüz onaylanmamış"},409);

    const requested=new Date(account.email_reset_requested_at).getTime();
    const confirmed=user.email_confirmed_at ? new Date(user.email_confirmed_at).getTime() : 0;
    const signed=user.last_sign_in_at ? new Date(user.last_sign_in_at).getTime() : 0;
    if(Math.max(confirmed,signed) < requested)
      return json({error:"E-postadaki bağlantıya henüz tıklanmamış. Önce e-postadaki bağlantıya dokunun."},409);

    const {error:up}=await db.from("rota2_accounts").update({
      email_verified_at:new Date().toISOString(),
      email_auth_user_id:user.id,
      email_reset_requested_at:null
    }).eq("account_id",accountId).eq("role","customer");
    if(up) return json({error:up.message},500);
    return json({ok:true,emailVerified:true,email});
  }

  if(action==="password-reset-email-start"){
    const role=String(b.role||"").trim();
    const email=String(b.email||"").trim().toLowerCase();
    if(!["customer","driver"].includes(role) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return json({error:"Geçerli e-posta adresi girin"},400);

    const {data:account,error}=await db.from("rota2_accounts")
      .select("account_id,email,email_verified_at").eq("role",role).ilike("email",email).maybeSingle();
    if(error) return json({error:error.message},500);
    if(!account || !account.email_verified_at) return json({ok:true,emailSent:true});

    const key=publishableKey();
    if(!key) return json({error:"E-posta servisi yapılandırılmamış"},503);
    const emailRedirectTo="https://ftltemgtzkjfnkxsxxmd.supabase.co/functions/v1/rota-iphone-customer-v2";
    const rr=await fetch(url+"/auth/v1/otp?redirect_to="+encodeURIComponent(emailRedirectTo),{
      method:"POST",
      headers:{apikey:key,"Content-Type":"application/json"},
      body:JSON.stringify({email:String(account.email).toLowerCase(),create_user:false})
    });
    const jj=await rr.json().catch(()=>({}));
    if(!rr.ok) return json({error:String(jj.msg||jj.message||jj.error_description||jj.error||"E-posta gönderilemedi")},rr.status>=500?503:400);

    const {error:up}=await db.from("rota2_accounts")
      .update({email_reset_requested_at:new Date().toISOString()}).eq("account_id",account.account_id);
    if(up) return json({error:up.message},500);
    return json({ok:true,emailSent:true});
  }

  if(action==="password-reset-email-status"){
    const role=String(b.role||"").trim();
    const email=String(b.email||"").trim().toLowerCase();
    if(!["customer","driver"].includes(role) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return json({error:"Geçerli e-posta adresi girin"},400);

    const {data:account,error}=await db.from("rota2_accounts")
      .select("account_id,email,email_verified_at,email_reset_requested_at")
      .eq("role",role).ilike("email",email).maybeSingle();
    if(error) return json({error:error.message},500);
    if(!account?.email || !account.email_verified_at || !account.email_reset_requested_at)
      return json({ok:true,confirmed:false});

    const {data:users,error:ue}=await db.auth.admin.listUsers({page:1,perPage:1000});
    if(ue) return json({error:"E-posta onayı kontrol edilemedi"},500);
    const user=(users?.users||[]).find((u:any)=>String(u.email||"").toLowerCase()===email);
    if(!user) return json({ok:true,confirmed:false});

    const requested=new Date(account.email_reset_requested_at).getTime();
    const confirmed=user.email_confirmed_at ? new Date(user.email_confirmed_at).getTime() : 0;
    const signed=user.last_sign_in_at ? new Date(user.last_sign_in_at).getTime() : 0;
    return json({ok:true,confirmed:Math.max(confirmed,signed)>=requested});
  }

  if(action==="password-reset-email-confirm"){
    const role=String(b.role||"").trim();
    const email=String(b.email||"").trim().toLowerCase();
    const newPassword=String(b.newPassword||"");
    if(!["customer","driver"].includes(role) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return json({error:"Geçerli e-posta adresi girin"},400);
    if(newPassword.length<6) return json({error:"Yeni şifre en az 6 karakter olmalı"},400);

    const {data:account,error}=await db.from("rota2_accounts")
      .select("account_id,email,email_verified_at,email_reset_requested_at")
      .eq("role",role).ilike("email",email).maybeSingle();
    if(error) return json({error:error.message},500);
    if(!account?.email || !account.email_verified_at || !account.email_reset_requested_at)
      return json({error:"Şifre yenileme isteği bulunamadı"},400);

    const {data:users,error:ue}=await db.auth.admin.listUsers({page:1,perPage:1000});
    if(ue) return json({error:"E-posta onayı kontrol edilemedi"},500);
    const user=(users?.users||[]).find((u:any)=>String(u.email||"").toLowerCase()===email);
    if(!user) return json({error:"E-posta bağlantısı henüz onaylanmamış"},409);

    const requested=new Date(account.email_reset_requested_at).getTime();
    const confirmed=user.email_confirmed_at ? new Date(user.email_confirmed_at).getTime() : 0;
    const signed=user.last_sign_in_at ? new Date(user.last_sign_in_at).getTime() : 0;
    if(Math.max(confirmed,signed) < requested)
      return json({error:"E-postadaki şifre yenileme bağlantısına önce dokunun."},409);

    const password_hash=await hashPassword(newPassword);
    const {error:up}=await db.from("rota2_accounts").update({
      password_hash,
      session_token_hash:null,
      email_reset_requested_at:null
    }).eq("account_id",account.account_id).eq("role",role);
    if(up) return json({error:up.message},500);
    return json({ok:true,passwordChanged:true});
  }

  if(action==="email-link-start"){
    const role=String(b.role||"").trim();
    const phone=phone10(String(b.phone||""));
    const password=String(b.password||"");
    const email=String(b.email||"").trim().toLowerCase();
    if(!["customer","driver"].includes(role) || phone.length!==10) return json({error:"Geçerli telefon numarası girin"},400);
    if(password.length<6) return json({error:"Mevcut şifrenizi girin"},400);
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({error:"Geçerli e-posta adresi girin"},400);

    const {data:account,error}=await db.from("rota2_accounts")
      .select("account_id,password_hash").eq("role",role).eq("phone",phone).maybeSingle();
    if(error) return json({error:error.message},500);
    if(!account || !(await verifyPassword(password,account.password_hash))) return json({error:"Telefon veya mevcut şifre hatalı"},401);

    const {data:dup}=await db.from("rota2_accounts").select("account_id")
      .eq("role",role).ilike("email",email).neq("account_id",account.account_id).maybeSingle();
    if(dup) return json({error:"Bu e-posta başka bir hesapta kayıtlı"},409);

    const key=publishableKey();
    const rr=await fetch(url+"/auth/v1/otp",{
      method:"POST",
      headers:{apikey:key,"Content-Type":"application/json"},
      body:JSON.stringify({email,create_user:true})
    });
    const jj=await rr.json().catch(()=>({}));
    if(!rr.ok) return json({error:String(jj.msg||jj.message||jj.error_description||jj.error||"E-posta gönderilemedi")},rr.status>=500?503:400);

    const now=new Date().toISOString();
    await db.from("rota2_accounts").update({
      email,
      email_verified_at:null,
      email_reset_requested_at:now
    }).eq("account_id",account.account_id);

    return json({ok:true,emailSent:true,emailMasked:email.replace(/^(.).+(@.+)$/,"$1***$2")});
  }

  if(action==="email-link-confirm"){
    const role=String(b.role||"").trim();
    const phone=phone10(String(b.phone||""));
    const password=String(b.password||"");
    const email=String(b.email||"").trim().toLowerCase();
    if(!["customer","driver"].includes(role) || phone.length!==10) return json({error:"Geçerli telefon numarası girin"},400);
    if(password.length<6) return json({error:"Mevcut şifrenizi girin"},400);

    const {data:account,error}=await db.from("rota2_accounts")
      .select("account_id,password_hash,email,email_reset_requested_at")
      .eq("role",role).eq("phone",phone).maybeSingle();
    if(error) return json({error:error.message},500);
    if(!account || !(await verifyPassword(password,account.password_hash))) return json({error:"Telefon veya mevcut şifre hatalı"},401);
    if(String(account.email||"").toLowerCase()!==email) return json({error:"E-posta adresi eşleşmedi"},400);

    const {data:users,error:ue}=await db.auth.admin.listUsers({page:1,perPage:1000});
    if(ue) return json({error:"E-posta doğrulaması kontrol edilemedi"},500);
    const user=(users?.users||[]).find((u:any)=>String(u.email||"").toLowerCase()===email);
    if(!user) return json({error:"E-posta onayı henüz tamamlanmamış"},409);

    const requested=account.email_reset_requested_at ? new Date(account.email_reset_requested_at).getTime() : 0;
    const confirmed=user.email_confirmed_at ? new Date(user.email_confirmed_at).getTime() : 0;
    const signed=user.last_sign_in_at ? new Date(user.last_sign_in_at).getTime() : 0;
    if(Math.max(confirmed,signed) < requested) return json({error:"E-postadaki onay bağlantısına henüz tıklanmamış. Önce e-postadaki bağlantıya dokunun."},409);

    await db.from("rota2_accounts").update({
      email_verified_at:new Date().toISOString(),
      email_auth_user_id:user.id,
      email_reset_requested_at:null
    }).eq("account_id",account.account_id);
    return json({ok:true,emailVerified:true,email});
  }

  if(action==="password-reset-start"){
    const role=String(b.role||"").trim();
    const phone=phone10(String(b.phone||""));
    if(!["customer","driver"].includes(role) || phone.length!==10) return json({error:"Geçerli telefon numarası girin"},400);

    const {data:account,error}=await db.from("rota2_accounts")
      .select("account_id,email,email_verified_at").eq("role",role).eq("phone",phone).maybeSingle();
    if(error) return json({error:error.message},500);
    if(!account) return json({ok:true,emailSent:true});
    if(!account.email || !account.email_verified_at) {
      return json({error:"Bu hesaba doğrulanmış e-posta tanımlanmamış. Önce E-posta Tanımla işlemini tamamlayın.",emailRequired:true},409);
    }

    const key=publishableKey();
    const rr=await fetch(url+"/auth/v1/otp",{
      method:"POST",
      headers:{apikey:key,"Content-Type":"application/json"},
      body:JSON.stringify({email:account.email,create_user:false})
    });
    const jj=await rr.json().catch(()=>({}));
    if(!rr.ok) return json({error:String(jj.msg||jj.message||jj.error_description||jj.error||"E-posta gönderilemedi")},rr.status>=500?503:400);

    await db.from("rota2_accounts").update({email_reset_requested_at:new Date().toISOString()}).eq("account_id",account.account_id);
    return json({ok:true,emailSent:true,emailMasked:String(account.email).replace(/^(.).+(@.+)$/,"$1***$2")});
  }

  if(action==="password-reset-confirm"){
    const role=String(b.role||"").trim();
    const phone=phone10(String(b.phone||""));
    const newPassword=String(b.newPassword||"");
    if(!["customer","driver"].includes(role) || phone.length!==10) return json({error:"Geçerli telefon numarası girin"},400);
    if(newPassword.length<6) return json({error:"Yeni şifre en az 6 karakter olmalı"},400);

    const {data:account,error}=await db.from("rota2_accounts")
      .select("account_id,email,email_verified_at,email_reset_requested_at")
      .eq("role",role).eq("phone",phone).maybeSingle();
    if(error) return json({error:error.message},500);
    if(!account?.email || !account.email_verified_at || !account.email_reset_requested_at) return json({error:"Şifre sıfırlama isteği bulunamadı"},400);

    const {data:users,error:ue}=await db.auth.admin.listUsers({page:1,perPage:1000});
    if(ue) return json({error:"E-posta onayı kontrol edilemedi"},500);
    const user=(users?.users||[]).find((u:any)=>String(u.email||"").toLowerCase()===String(account.email).toLowerCase());
    if(!user) return json({error:"E-posta onayı henüz tamamlanmamış"},409);

    const requested=new Date(account.email_reset_requested_at).getTime();
    const signed=user.last_sign_in_at ? new Date(user.last_sign_in_at).getTime() : 0;
    const confirmed=user.email_confirmed_at ? new Date(user.email_confirmed_at).getTime() : 0;
    if(Math.max(signed,confirmed) < requested) return json({error:"E-postadaki onay bağlantısına henüz tıklanmamış. Önce e-postadaki bağlantıya dokunun."},409);

    const password_hash=await hashPassword(newPassword);
    const {error:up}=await db.from("rota2_accounts").update({
      password_hash,
      session_token_hash:null,
      email_reset_requested_at:null
    }).eq("account_id",account.account_id).eq("role",role);
    if(up) return json({error:up.message},500);
    return json({ok:true,passwordChanged:true});
  }

  return json({error:"Bilinmeyen işlem"},404);
});
