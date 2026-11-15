import { createClient } from "npm:@supabase/supabase-js@2";

const SUPA_URL=Deno.env.get("SUPABASE_URL")||"";
const SECRET=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}").default||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";

async function publishTracker(){
  const raw=await fetch("https://raw.githubusercontent.com/sgokhansalas-eng/rota-app/main/share/index.html",{cache:"no-store"});
  if(!raw.ok) throw new Error("Takip sayfası alınamadı");
  const html=await raw.text();
  const pub=await fetch("https://ship.page/deploy",{method:"POST",headers:{"Content-Type":"text/html; charset=utf-8"},body:html});
  const txt=await pub.text();
  if(!pub.ok) throw new Error("Takip sayfası yayınlanamadı");
  const j=JSON.parse(txt);
  return {base_url:j.url,expires_at:j.expires_at};
}

Deno.serve(async req=>{
  try{
    const u=new URL(req.url);
    const token=String(u.searchParams.get("token")||"").trim();
    if(!token) return Response.json({error:"Takip bağlantısı geçersiz"},{status:400});

    const admin=createClient(SUPA_URL,SECRET,{auth:{persistSession:false}});
    const {data:share}=await admin.from("rota2_trip_share_tokens")
      .select("token,expires_at,revoked_at")
      .eq("token",token).maybeSingle();
    if(!share||share.revoked_at||new Date(share.expires_at).getTime()<Date.now()){
      return Response.json({error:"Takip bağlantısının süresi dolmuş"},{status:410});
    }

    let {data:host}=await admin.from("rota2_tracker_host")
      .select("base_url,expires_at").eq("id",1).maybeSingle();

    if(!host || new Date(host.expires_at).getTime() < Date.now()+6*60*60*1000){
      const fresh=await publishTracker();
      await admin.from("rota2_tracker_host").upsert({
        id:1,base_url:fresh.base_url,expires_at:fresh.expires_at,updated_at:new Date().toISOString()
      },{onConflict:"id"});
      host=fresh;
    }

    const dest=host.base_url+(host.base_url.includes("?")?"&":"?")+"token="+encodeURIComponent(token);
    return Response.redirect(dest,302);
  }catch(e){
    return Response.json({error:e instanceof Error?e.message:String(e)},{status:500});
  }
});