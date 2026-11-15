
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json=(d:any,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{...cors,"content-type":"application/json; charset=utf-8"}});

const GEO_KEY="a3e11f83fded47938c61e903ece3fd90";
const GOOGLE_KEY=Deno.env.get("GOOGLE_MAPS_API_KEY")||Deno.env.get("GOOGLE_PLACES_API_KEY")||"";

const norm=(s:string)=>s
  .replace(/\bsk\.?\b/gi,"sokak")
  .replace(/\bsok\.?\b/gi,"sokak")
  .replace(/\bcd\.?\b/gi,"cadde")
  .replace(/\bcad\.?\b/gi,"cadde")
  .replace(/\bblv\.?\b/gi,"bulvar")
  .replace(/\bbulv\.?\b/gi,"bulvar")
  .replace(/\bmh\.?\b/gi,"mahalle")
  .replace(/\bmah\.?\b/gi,"mahalle")
  .replace(/\s+/g," ")
  .trim();

const clean=(s:string)=>s.toLocaleLowerCase("tr-TR").replace(/[^a-z0-9çğıöşü\s]/gi," ").replace(/\s+/g," ").trim();

function googleKind(types:any[]){
  const t=(types||[]).map(String);
  if(t.some(x=>x==="airport"||x==="international_airport")) return "Havalimanı";
  if(t.some(x=>/hospital|doctor|health/.test(x))) return "Sağlık";
  if(t.some(x=>/school|university|college/.test(x))) return "Okul/Üniversite";
  if(t.some(x=>/lodging|hotel/.test(x))) return "Otel/Konaklama";
  if(t.some(x=>/restaurant|cafe|food/.test(x))) return "Restoran/Kafe";
  if(t.some(x=>/shopping_mall|store|supermarket/.test(x))) return "İşletme/Mağaza";
  if(t.some(x=>/bus_station|train_station|transit_station/.test(x))) return "Ulaşım";
  if(t.some(x=>/government|local_government|courthouse|police/.test(x))) return "Kamu Kurumu";
  return "Yer/İşletme";
}

async function googleSearch(text:string,lat?:number,lng?:number){
  if(!GOOGLE_KEY) return [];
  const body:any={
    textQuery:text,
    languageCode:"tr",
    regionCode:"TR",
    pageSize:20,
    rankPreference:"RELEVANCE"
  };
  if(Number.isFinite(lat)&&Number.isFinite(lng)){
    body.locationBias={circle:{center:{latitude:lat,longitude:lng},radius:50000}};
  }
  const r=await fetch("https://places.googleapis.com/v1/places:searchText",{
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "X-Goog-Api-Key":GOOGLE_KEY,
      "X-Goog-FieldMask":"places.id,places.displayName,places.formattedAddress,places.location,places.primaryType,places.types"
    },
    body:JSON.stringify(body)
  });
  if(!r.ok){
    const e=await r.text().catch(()=>"");
    console.error("google places",r.status,e.slice(0,300));
    return [];
  }
  const j=await r.json();
  return (j.places||[]).map((p:any)=>{
    const name=String(p.displayName?.text||"").trim();
    const address=String(p.formattedAddress||"").trim();
    return {
      label:name && address && !clean(address).startsWith(clean(name)) ? name+", "+address : (address||name),
      name,
      kind:googleKind(p.types||[]),
      lat:Number(p.location?.latitude),
      lng:Number(p.location?.longitude),
      source:"google",
      placeId:String(p.id||"")
    };
  }).filter((x:any)=>x.label&&Number.isFinite(x.lat)&&Number.isFinite(x.lng));
}

async function geoapifySearch(text:string,lat?:number,lng?:number){
  const u=new URL("https://api.geoapify.com/v1/geocode/autocomplete");
  u.searchParams.set("text",text);
  u.searchParams.set("format","json");
  u.searchParams.set("lang","tr");
  u.searchParams.set("limit","20");
  u.searchParams.set("filter","countrycode:tr");
  if(Number.isFinite(lat)&&Number.isFinite(lng)) u.searchParams.set("bias","proximity:"+lng+","+lat);
  u.searchParams.set("apiKey",GEO_KEY);
  const r=await fetch(u);
  if(!r.ok) throw new Error("geoapify "+r.status);
  const j=await r.json();
  return (j.results||[]).map((x:any)=>{
    const kind=x.result_type==="street"?"Sokak/Cadde":
      x.result_type==="suburb"||x.result_type==="district"?"Mahalle/İlçe":
      x.result_type==="city"||x.result_type==="county"?"İlçe/Şehir":
      x.result_type==="building"?"Bina/Adres":"Adres";
    return {
      label:x.formatted||[x.address_line1,x.address_line2].filter(Boolean).join(", "),
      name:x.name||x.address_line1||"",
      kind,
      lat:Number(x.lat),
      lng:Number(x.lon),
      source:"geoapify"
    };
  }).filter((x:any)=>x.label&&Number.isFinite(x.lat)&&Number.isFinite(x.lng));
}

function poiKind(categories:any[]){
  const cs=(categories||[]).map(String);
  if(cs.some(x=>x==="airport"||x.startsWith("airport."))) return "Havalimanı";
  if(cs.some(x=>x==="education"||x.startsWith("education."))) return "Okul/Üniversite";
  if(cs.some(x=>x==="government"||x.startsWith("government."))) return "Kamu Kurumu";
  if(cs.some(x=>x==="office"||x.startsWith("office.")||x==="commercial"||x.startsWith("commercial.")||x==="service"||x.startsWith("service."))) return "İşletme/Şirket";
  if(cs.some(x=>x==="accommodation"||x.startsWith("accommodation."))) return "Otel/Konaklama";
  if(cs.some(x=>x==="healthcare"||x.startsWith("healthcare."))) return "Sağlık";
  if(cs.some(x=>x==="catering"||x.startsWith("catering."))) return "Restoran/Kafe";
  if(cs.some(x=>x==="public_transport"||x.startsWith("public_transport."))) return "Ulaşım";
  if(cs.some(x=>x==="tourism"||x.startsWith("tourism.")||x==="entertainment"||x.startsWith("entertainment."))) return "Mekan";
  return "Yer/İşletme";
}

async function geoapifyPlaces(text:string,lat?:number,lng?:number){
  const q=String(text||"").trim();
  if(q.length<2) return [];
  const u=new URL("https://api.geoapify.com/v2/places");
  u.searchParams.set("categories","airport,commercial,office,service,accommodation,healthcare,catering,public_transport,tourism,entertainment,education");
  u.searchParams.set("filter","countrycode:tr");
  if(Number.isFinite(lat)&&Number.isFinite(lng)) u.searchParams.set("bias","proximity:"+lng+","+lat);
  u.searchParams.set("name",q);
  u.searchParams.set("lang","tr");
  u.searchParams.set("limit","20");
  u.searchParams.set("apiKey",GEO_KEY);
  const r=await fetch(u);
  if(!r.ok) throw new Error("geoapify places "+r.status);
  const j=await r.json();
  return (j.features||[]).map((f:any)=>{
    const p=f.properties||{};
    const c=f.geometry?.coordinates||[];
    const latv=Number.isFinite(Number(p.lat))?Number(p.lat):Number(c[1]);
    const lngv=Number.isFinite(Number(p.lon))?Number(p.lon):Number(c[0]);
    const name=String(p.name||p.address_line1||"").trim();
    const formatted=String(p.formatted||[p.address_line1,p.address_line2].filter(Boolean).join(", ")).trim();
    let label=formatted;
    if(name && formatted && !clean(formatted).startsWith(clean(name))) label=name+", "+formatted;
    else if(name && !formatted) label=name;
    return {
      label,
      name,
      kind:poiKind(p.categories||[]),
      lat:latv,
      lng:lngv,
      distance:Number(p.distance),
      source:"geoapify-places"
    };
  }).filter((x:any)=>x.label&&Number.isFinite(x.lat)&&Number.isFinite(x.lng));
}


const photonCache=new Map<string,{t:number,v:any[]}>();

async function photonSearch(text:string,lat?:number,lng?:number){
  const q=String(text||"").trim();
  if(q.length<3) return [];
  const ck=clean(q)+"|"+(Number.isFinite(lat)?Number(lat).toFixed(2):"")+"|"+(Number.isFinite(lng)?Number(lng).toFixed(2):"");
  const hit=photonCache.get(ck);
  if(hit && Date.now()-hit.t<60000) return hit.v;
  const u=new URL("https://photon.komoot.io/api/");
  u.searchParams.set("q",q);
  u.searchParams.set("lang","tr");
  u.searchParams.set("limit","20");
  if(Number.isFinite(lat)&&Number.isFinite(lng)){
    u.searchParams.set("lat",String(lat));
    u.searchParams.set("lon",String(lng));
    u.searchParams.set("zoom","12");
    u.searchParams.set("location_bias_scale","0.15");
  }
  const r=await fetch(u,{headers:{"Accept":"application/json","User-Agent":"ROTA-Turkiye/6.0"}});
  if(!r.ok) throw new Error("photon "+r.status);
  const j=await r.json();
  const out=(j.features||[]).map((ft:any)=>{
    const p=ft.properties||{};
    if(String(p.countrycode||"").toUpperCase()!=="TR") return null;
    const c=ft.geometry?.coordinates||[];
    const name=String(p.name||p.street||p.city||p.county||"").trim();
    const road=[p.street||"",p.housenumber||""].filter(Boolean).join(" ");
    const parts=[name,road,p.district||p.locality||p.suburb||"",p.city||p.county||"",p.state||"",p.postcode||""]
      .filter((v:any,i:number,a:any[])=>v&&a.indexOf(v)===i);
    const label=parts.join(", ");
    const osm=String(p.osm_key||"")+" "+String(p.osm_value||"");
    let kind="Adres/Yer";
    if(/aeroway|airport|aerodrome/i.test(osm)) kind="Havalimanı";
    else if(/hospital|clinic|doctors|healthcare/i.test(osm)) kind="Sağlık";
    else if(/school|university|college|kindergarten/i.test(osm)) kind="Okul/Üniversite";
    else if(/hotel|hostel|motel|guest_house/i.test(osm)) kind="Otel/Konaklama";
    else if(/restaurant|cafe|fast_food|food_court/i.test(osm)) kind="Restoran/Kafe";
    else if(/shop|office|commercial|mall|supermarket/i.test(osm)) kind="İşletme/Mağaza";
    else if(/station|bus_stop|railway|public_transport/i.test(osm)) kind="Ulaşım";
    else if(/government|townhall|courthouse|police|military/i.test(osm)) kind="Kamu/Kurum";
    return {
      label:label||name,
      name,
      kind,
      lat:Number(c[1]),
      lng:Number(c[0]),
      source:"photon",
      state:String(p.state||""),
      city:String(p.city||""),
      county:String(p.county||"")
    };
  }).filter((x:any)=>x&&x.label&&Number.isFinite(x.lat)&&Number.isFinite(x.lng));
  photonCache.set(ck,{t:Date.now(),v:out});
  return out;
}

const provinceCodes:Record<string,number>={
"adana":1,"adıyaman":2,"adiyaman":2,"afyonkarahisar":3,"afyon":3,"ağrı":4,"agri":4,"amasya":5,"ankara":6,"antalya":7,"artvin":8,"aydın":9,"aydin":9,
"balıkesir":10,"balikesir":10,"bilecik":11,"bingöl":12,"bingol":12,"bitlis":13,"bolu":14,"burdur":15,"bursa":16,"çanakkale":17,"canakkale":17,
"çankırı":18,"cankiri":18,"çorum":19,"corum":19,"denizli":20,"diyarbakır":21,"diyarbakir":21,"edirne":22,"elazığ":23,"elazig":23,"erzincan":24,
"erzurum":25,"eskişehir":26,"eskisehir":26,"gaziantep":27,"giresun":28,"gümüşhane":29,"gumushane":29,"hakkari":30,"hatay":31,"isparta":32,"mersin":33,
"istanbul":34,"izmir":35,"kars":36,"kastamonu":37,"kayseri":38,"kırklareli":39,"kirklareli":39,"kırşehir":40,"kirsehir":40,"kocaeli":41,"konya":42,
"kütahya":43,"kutahya":43,"malatya":44,"manisa":45,"kahramanmaraş":46,"kahramanmaras":46,"mardin":47,"muğla":48,"mugla":48,"muş":49,"mus":49,
"nevşehir":50,"nevsehir":50,"niğde":51,"nigde":51,"ordu":52,"rize":53,"sakarya":54,"samsun":55,"siirt":56,"sinop":57,"sivas":58,"tekirdağ":59,
"tekirdag":59,"tokat":60,"trabzon":61,"tunceli":62,"şanlıurfa":63,"sanliurfa":63,"urfa":63,"uşak":64,"usak":64,"van":65,"yozgat":66,"zonguldak":67,
"aksaray":68,"bayburt":69,"karaman":70,"kırıkkale":71,"kirikkale":71,"batman":72,"şırnak":73,"sirnak":73,"bartın":74,"bartin":74,"ardahan":75,
"ığdır":76,"igdir":76,"yalova":77,"karabük":78,"karabuk":78,"kilis":79,"osmaniye":80,"düzce":81,"duzce":81
};

function provinceCodeFrom(raw:string,rows:any[],area:string){
  const pool=[raw,area,...(rows||[]).flatMap((x:any)=>[x.state,x.city,x.county])].map(clean);
  for(const s of pool){
    for(const [name,code] of Object.entries(provinceCodes)){
      if(s===name || s.includes(" "+name+" ") || s.startsWith(name+" ") || s.endsWith(" "+name)) return code;
    }
  }
  return 0;
}

function hgmCategoryKeys(raw:string){
  const q=clean(raw);
  const keys:string[]=[];
  const add=(...xs:string[])=>{for(const x of xs) if(!keys.includes(x)) keys.push(x)};
  if(/havaliman|havaalan|airport/.test(q)) add("havalimani","havaalani");
  if(/orduevi|ordu evi/.test(q)) add("orduevi");
  if(/hastane|hospital/.test(q)) add("hastane");
  if(/eczane|pharmacy/.test(q)) add("eczane");
  if(/üniversite|universite|university/.test(q)) add("universite");
  if(/okul|school|lise|kolej/.test(q)) add("okul");
  if(/otel|hotel|konaklama/.test(q)) add("otel");
  if(/restoran|restaurant/.test(q)) add("restoran");
  if(/kafe|cafe/.test(q)) add("kafe");
  if(/avm|alışveriş merkezi|alisveris merkezi/.test(q)) add("avm");
  if(/market|supermarket/.test(q)) add("market");
  if(/benzin|akaryakıt|akaryakit|petrol/.test(q)) add("akaryakit","benzinlik");
  return keys.slice(0,2);
}

async function hgmCategorySearch(raw:string,provinceCode:number){
  const keys=hgmCategoryKeys(raw);
  if(!provinceCode||!keys.length) return [];
  const all:any[]=[];
  for(const key of keys){
    try{
      const u=new URL("https://atlas.harita.gov.tr/webservis/category");
      u.searchParams.set("type","2");
      u.searchParams.set("id",String(provinceCode));
      u.searchParams.set("category",key);
      u.searchParams.set("limit","30");
      u.searchParams.set("offset","0");
      const r=await fetch(u,{headers:{"Accept":"application/json","User-Agent":"ROTA-Turkiye/6.0"}});
      if(!r.ok) continue;
      const j=await r.json();
      for(const ft of (j.features||[])){
        const p=ft.properties||{};
        const c=ft.geometry?.coordinates||[];
        const name=String(p.name||"").trim();
        const label=[name,p.locality||"",p.county||"",p.region||""].filter(Boolean).join(", ");
        const x={label,name,kind:"HGM Atlas",lat:Number(c[1]),lng:Number(c[0]),source:"hgm"};
        if(x.label&&Number.isFinite(x.lat)&&Number.isFinite(x.lng)) all.push(x);
      }
    }catch(e){console.error("hgm category",e);}
  }
  return all;
}

function scoreResult(x:any,raw:string){
  const q=clean(raw),n=clean(x.name||""),l=clean(x.label||"");
  let s=0;
  if(x.source==="google") s+=400;
  if(x.source==="hgm") s+=330;
  if(x.source==="photon") s+=220;
  if(x.source==="geoapify-places") s+=120;
  if(n===q) s+=1000;
  else if(n.startsWith(q)&&q.length>=3) s+=760;
  else if(n.includes(q)&&q.length>=3) s+=620;
  if(l===q) s+=850;
  else if(l.startsWith(q)&&q.length>=3) s+=520;
  else if(l.includes(q)&&q.length>=3) s+=360;
  if((q.includes("havaliman")||q.includes("havaalan")||q.includes("airport")) && x.kind==="Havalimanı") s+=500;
  if(Number.isFinite(x.distance)) s-=Math.min(x.distance/10000,80);
  return s;
}

async function geoapifyReverse(lat:number,lng:number){
  const u=new URL("https://api.geoapify.com/v1/geocode/reverse");
  u.searchParams.set("lat",String(lat));
  u.searchParams.set("lon",String(lng));
  u.searchParams.set("format","json");
  u.searchParams.set("lang","tr");
  u.searchParams.set("apiKey",GEO_KEY);
  const r=await fetch(u);
  if(!r.ok) throw new Error("geoapify reverse "+r.status);
  const j=await r.json();
  const x=j.results?.[0]||{};
  return {label:x.formatted||"Mevcut konumunuz",area:x.suburb||x.district||x.city||x.county||""};
}

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS") return new Response("ok",{headers:cors});
  const u=new URL(req.url);
  const action=u.searchParams.get("action")||"";
  const b=req.method==="GET"?Object.fromEntries(u.searchParams.entries()):await req.json().catch(()=>({}));

  try{
    if(action==="health") return json({
      ok:true,
      version:6,
      provider:GOOGLE_KEY?"google+geoapify+photon+hgm":"geoapify+photon+hgm",
      googleConfigured:!!GOOGLE_KEY,
      scope:"turkiye"
    });

    if(action==="search"){
      const raw=String(b.q||"").trim();
      if(raw.length<2) return json({results:[]});
      const q=norm(raw);
      const lat=Number(b.lat),lng=Number(b.lng),area=String(b.area||"").trim();
      const seen=new Set<string>(),out:any[]=[];
      const addRows=(rows:any[])=>{
        for(const x of (rows||[])){
          const k=clean(x.label||"")+"|"+(Number(x.lat)||0).toFixed(4)+"|"+(Number(x.lng)||0).toFixed(4);
          if(x.label && !seen.has(k)){seen.add(k);out.push(x);}
        }
      };

      const base=await Promise.allSettled([
        googleSearch(raw,lat,lng),
        geoapifyPlaces(raw,lat,lng),
        photonSearch(raw,lat,lng),
        photonSearch(q+", Türkiye",lat,lng)
      ]);
      for(const r of base) if(r.status==="fulfilled") addRows(r.value);

      let pcode=provinceCodeFrom(raw,out,area);
      if(!pcode){
        const parts=raw.split(/\s+/).filter(Boolean);
        if(parts.length>=2){
          try{
            const ctx=await photonSearch(parts.slice(0,Math.min(2,parts.length-1)).join(" "),lat,lng);
            pcode=provinceCodeFrom(raw,ctx,area);
          }catch{}
        }
      }

      try{ addRows(await hgmCategorySearch(raw,pcode)); }catch{}

      const queries:string[]=[];
      if(area){
        queries.push(q+", "+area+", Türkiye");
        if(clean(raw)!==clean(q)) queries.push(raw+", "+area+", Türkiye");
      }
      queries.push(q+", Türkiye");
      if(clean(raw)!==clean(q)) queries.push(raw+", Türkiye");
      queries.push(q);

      for(const qq of queries){
        try{ addRows(await geoapifySearch(qq,lat,lng)); }catch{}
        if(out.length>=55) break;
      }

      out.sort((a,b)=>scoreResult(b,raw)-scoreResult(a,raw));
      return json({
        results:out.slice(0,25),
        scope:"turkiye",
        provider:GOOGLE_KEY?"google+geoapify+photon+hgm":"geoapify+photon+hgm",
        googleConfigured:!!GOOGLE_KEY,
        version:6
      });
    }

    if(action==="reverse"){
      const lat=Number(b.lat),lng=Number(b.lng);
      if(!Number.isFinite(lat)||!Number.isFinite(lng)) return json({error:"Konum eksik"},400);
      return json(await geoapifyReverse(lat,lng));
    }

    if(action==="route"){
      const fl=Number(b.fl),fn=Number(b.fn),tl=Number(b.tl),tn=Number(b.tn);
      const ru="https://router.project-osrm.org/route/v1/driving/"+fn+","+fl+";"+tn+","+tl+"?overview=full&geometries=geojson";
      const r=await fetch(ru,{headers:{"User-Agent":"ROTA-Turkiye/6.0"}});
      const j=await r.json().catch(()=>({}));
      if(!r.ok||j.code!=="Ok"||!j.routes?.length) return json({error:"Rota bulunamadı"},404);
      return json({
        km:j.routes[0].distance/1000,
        durationMinutes:Math.max(1,Math.round(Number(j.routes[0].duration||0)/60)),
        geometry:j.routes[0].geometry
      });
    }

    return json({error:"Bilinmeyen işlem"},404);
  }catch(e){
    console.error("rota2-geo",e);
    return json({error:"Adres servisi geçici olarak kullanılamıyor"},502);
  }
});
