/* ROTA Müşteri — güvenli arayüz eylem katmanı.
 * Mevcut harita, giriş ve sürücü uygulamalarının kaynak kodunu değiştirmez.
 */
(function(){
"use strict";
if(window.__rotaUiControls20261119)return;
window.__rotaUiControls20261119=true;
const CORE="https://ftltemgtzkjfnkxsxxmd.supabase.co/functions/v1/rota2-core";
const GEO="https://ftltemgtzkjfnkxsxxmd.supabase.co/functions/v1/rota2-geo";
const KEY="sb_publishable_2d5xkUbWQECxv8jyaq2-Bg_sc-Qo8cr";
const q=id=>document.getElementById(id);
const make=(tag,value,cls)=>{const n=document.createElement(tag);if(value!==undefined)n.textContent=String(value);if(cls)n.className=cls;return n};
const creds=()=>({accountId:localStorage.getItem("rota_customer_account_id")||"",sessionToken:localStorage.getItem("rota_customer_session")||""});
const tripId=()=>localStorage.getItem("rota_active_trip_id")||localStorage.getItem("rota_trip_id")||"";
const headers=()=>({"Content-Type":"application/json",apikey:KEY,Authorization:"Bearer "+KEY});
let sending=false, polling=0, searchTimeout=0, chatTimer=0;
const style=document.createElement("style");
style.id="rotaUiControlsCss";
style.textContent=[
"#rotaUiDialog{position:fixed;inset:0;z-index:2500000;background:rgba(7,18,40,.75);display:none;align-items:center;justify-content:center;padding:15px;box-sizing:border-box}",
"#rotaUiDialog.show{display:flex}",
"#rotaUiDialog .ru-box{width:min(100%,470px);max-height:88dvh;overflow:auto;background:#fff;border-radius:19px;color:#122037;box-shadow:0 16px 45px #0004}",
"#rotaUiDialog .ru-head{display:flex;align-items:center;justify-content:space-between;background:#101b30;color:#fff;padding:14px 16px;font-weight:850;font-size:17px;position:sticky;top:0}",
"#rotaUiDialog .ru-body{padding:16px}",
"#rotaUiDialog .ru-close{border:0;background:transparent;color:#fff;font-size:28px;padding:0 6px;cursor:pointer}",
"#rotaUiDialog .ru-btn{border:0;background:#e10600;color:#fff;border-radius:11px;padding:13px 15px;font-weight:800;font-size:15px;cursor:pointer}",
"#rotaUiDialog .ru-alt{background:#e9eef7;color:#101b30}",
"#rotaUiDialog .ru-muted{color:#64748b;font-size:13px}",
"#rotaUiDialog .ru-error{color:#b91c1c;font-size:13px}",
"#rotaUiDialog input,#rotaUiDialog select{width:100%;box-sizing:border-box;padding:12px;border:1px solid #d0d9e5;border-radius:10px;margin:6px 0 11px;font-size:16px}",
"#rotaUiDialog .ru-row{display:flex;gap:9px;flex-wrap:wrap;margin-top:13px}",
"#rotaUiDialog .ru-card{border:1px solid #e0e7f0;border-radius:11px;padding:12px;margin:7px 0;width:100%;text-align:left;background:white;color:#101b30;cursor:pointer}",
"#rotaUiDialog .ru-messages{max-height:43dvh;min-height:90px;overflow:auto;border:1px solid #e2e8f0;border-radius:11px;padding:10px;background:#f8fafc}",
"#rotaUiDialog .ru-message{max-width:90%;padding:9px 11px;border-radius:12px;margin:6px 0;background:#e2e8f0;overflow-wrap:anywhere}",
"#rotaUiDialog .ru-message.me{margin-left:auto;background:#dbeafe}",
"#r33SearchBox{position:relative!important}",
"#r33SearchBox #sug{z-index:90000!important;max-height:230px!important;overflow-y:auto!important;position:absolute!important;top:100%!important;left:0!important;right:0!important;background:white!important;box-shadow:0 8px 25px #0002;border-radius:11px}",
"#r33SearchBox input{pointer-events:auto!important;position:relative!important;z-index:2!important}"
].join("\n");
document.head.appendChild(style);

/* Eski CSS, body'nin doğrudan altındaki bütün pencereleri display:none!important
 * yapıyordu. İlgili pencereleri görünür uygulama köküne taşı. */
function moveModals(){
 const root=q("rotaDesign33");
 if(!root)return;
 const list=Array.from(document.body.children);
 list.forEach(n=>{
  if(!n.id||n.id==="authOverlay"||n===root)return;
  if(/modal|dialog|overlay/i.test(n.id))root.appendChild(n);
 });
}
new MutationObserver(moveModals).observe(document.body,{childList:true});
moveModals();

async function api(action,extra){
 const c=creds();
 if(!c.accountId||!c.sessionToken)throw Error("Oturum süresi dolmuş olabilir. Lütfen çıkış yapıp tekrar giriş yapın.");
 const response=await fetch(CORE+"?action="+encodeURIComponent(action),{
  method:"POST",headers:headers(),body:JSON.stringify(Object.assign({},c,extra||{}))
 });
 const result=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(result.error||"İşlem tamamlanamadı ("+response.status+").");
 return result;
}
function dialog(title){
 let el=q("rotaUiDialog");
 if(!el){
  el=make("div");el.id="rotaUiDialog";el.innerHTML='<div class="ru-box"><div class="ru-head"><span id="ruTitle"></span><button type="button" class="ru-close" id="ruClose" aria-label="Kapat">×</button></div><div class="ru-body" id="ruBody"></div></div>';
  (q("rotaDesign33")||document.body).appendChild(el);
  q("ruClose").onclick=()=>el.classList.remove("show");
  el.addEventListener("click",e=>{if(e.target===el)el.classList.remove("show")});
 }
 q("ruTitle").textContent=title;
 const body=q("ruBody");body.replaceChildren();
 el.classList.add("show");
 q("r33Drawer")?.classList.remove("open");q("r33Back")?.classList.remove("open");
 return body;
}
function note(title,message){
 const b=dialog(title);b.appendChild(make("p",message,"ru-muted"));
 const done=make("button","Tamam","ru-btn");done.onclick=()=>q("rotaUiDialog").classList.remove("show");
 b.appendChild(done);
}
function errorTo(body,e){body.appendChild(make("p",e.message||String(e),"ru-error"))}
function showProgress(title){
 const body=dialog(title);body.appendChild(make("p","Yükleniyor…","ru-muted"));return body;
}
function appendRow(body,label,desc,onclick){
 const btn=make("button",undefined,"ru-card");btn.type="button";
 btn.append(make("strong",label));
 if(desc)btn.append(make("div",desc,"ru-muted"));
 if(onclick)btn.onclick=onclick;
 body.append(btn);return btn;
}
function readRide(){
 let p=null,t=null,v="Normal Araç",d=0,f=0;
 try{if(typeof pickup!=="undefined"&&pickup)p=pickup}catch(e){}
 try{if(typeof target!=="undefined"&&target)t=target}catch(e){}
 try{if(typeof vehicle!=="undefined"&&vehicle)v=vehicle}catch(e){}
 try{if(typeof km!=="undefined")d=Number(km||0)}catch(e){}
 try{if(typeof fare!=="undefined")f=Number(fare||0)}catch(e){}
 if(!d){const txt=q("routeinfo")?.textContent||"";const m=txt.match(/(\d+(?:[.,]\d+)?)\s*km/i);if(m)d=Number(m[1].replace(",","."))}
 return {p,t,v,d,f,description:q("dest")?.value||t?.label||"Hedef"};
}
function status(text){
 let node=q("rotaUiStatus");
 if(!node){
  node=make("div",undefined,"ru-muted");node.id="rotaUiStatus";
  const parent=q("r33Status")||q("r33Route");
  if(parent)parent.append(node);
 }
 if(node){node.textContent=text;node.style.padding="7px";node.style.color="#fff";}
}
async function fetchRoute(p,t){
 if(!p||!t)return 0;
 const r=await fetch(GEO+"?action=route",{method:"POST",headers:headers(),body:JSON.stringify({fl:Number(p.lat),fn:Number(p.lng),tl:Number(t.lat),tn:Number(t.lng)})});
 const j=await r.json().catch(()=>({}));
 if(!r.ok)throw Error(j.error||"Güzergâh hesaplanamadı.");
 const d=Number(j.km||0);
 if(!Number.isFinite(d)||d<=0)throw Error("Güzergâh mesafesi alınamadı.");
 try{km=d;fare=Math.round(d*27)}catch(e){}
 const routeText=q("routeinfo");if(routeText)routeText.textContent=d.toFixed(1)+" km • "+Math.round(d*27)+" TL";
 const metric=q("r33Km");if(metric)metric.textContent=d.toFixed(1)+" km";
 return d;
}
function selectDestination(point){
 if(!point||!Number.isFinite(Number(point.lat))||!Number.isFinite(Number(point.lng)))return;
 const p={lat:Number(point.lat),lng:Number(point.lng),label:String(point.address||point.label||"Seçilen adres")};
 try{target=p}catch(e){}
 const dest=q("dest");if(dest)dest.value=p.label;
 const s=q("sug");if(s){s.innerHTML="";s.classList.remove("show");}
 const ride=readRide();
 if(ride.p){fetchRoute(ride.p,p).catch(e=>status(e.message));}
 else status("Varış adresi seçildi. Alış konumunuzu da belirleyin.");
}
async function favorites(){
 const body=showProgress("Kayıtlı Konumlarım");
 try{
  const r=await api("customer-favorites");
  if(!q("rotaUiDialog")?.classList.contains("show"))return;
  body.replaceChildren();
  const rows=r.favorites||[];
  if(!rows.length)body.append(make("p","Henüz kayıtlı adresiniz yok.","ru-muted"));
  rows.forEach(x=>appendRow(body,x.label||"Konum",x.address||"",()=>{selectDestination(x);q("rotaUiDialog").classList.remove("show")}));
  const heading=make("strong","Yeni adres kaydet");heading.style.display="block";heading.style.marginTop="16px";body.append(heading);
  const kind=make("select");
  [["home","Ev"],["work","İş"],["custom","Diğer"]].forEach(([v,t])=>{const o=make("option",t);o.value=v;kind.append(o)});
  const name=make("input");name.placeholder="Adres adı (örn. Ev)";name.maxLength=60;
  const addr=make("input");addr.placeholder="Kaydedilecek adresi ara";addr.autocomplete="off";
  const results=make("div");
  let chosen=null,timer=null;
  addr.oninput=()=>{chosen=null;clearTimeout(timer);timer=setTimeout(async()=>{
   if(addr.value.trim().length<3){results.replaceChildren();return;}
   try{
    const r=await fetch(GEO+"?action=search&q="+encodeURIComponent(addr.value.trim()),{headers:{"apikey":KEY}});
    const j=await r.json();if(!r.ok)throw Error("Adres aranamadı.");
    results.replaceChildren();
    (j.results||[]).slice(0,7).forEach(x=>appendRow(results,x.label||"Adres",x.kind||"",()=>{chosen=x;addr.value=x.label;results.replaceChildren()}));
   }catch(e){results.replaceChildren(make("span",e.message,"ru-error"))}
  },350)};
  const save=make("button","Adresi Kaydet","ru-btn");
  const info=make("p",undefined,"ru-muted");
  save.onclick=async()=>{
   if(!chosen){info.textContent="Lütfen arama sonuçlarından bir adres seçin.";return}
   save.disabled=true;info.textContent="Kaydediliyor…";
   try{
    await api("save-customer-favorite",{kind:kind.value,label:name.value.trim()||(kind.value==="home"?"Ev":kind.value==="work"?"İş":"Konum"),address:chosen.label,lat:Number(chosen.lat),lng:Number(chosen.lng)});
    favorites();
   }catch(e){info.textContent=e.message}finally{save.disabled=false}
  };
  body.append(kind,name,addr,results,save,info);
 }catch(e){body.replaceChildren();errorTo(body,e)}
}
async function searchFallback(){
 const inp=q("dest"),box=q("sug");if(!inp||!box||inp.value.trim().length<2)return;
 if(box.children.length && getComputedStyle(box).display!=="none" && box.classList.contains("show"))return;
 const term=inp.value.trim();
 try{
  const res=await fetch(GEO+"?action=search&q="+encodeURIComponent(term),{headers:{apikey:KEY}});
  const j=await res.json();if(!res.ok||q("dest")?.value.trim()!==term)return;
  box.replaceChildren();
  (j.results||[]).slice(0,8).forEach(p=>appendRow(box,p.label||"Adres",p.kind||"",()=>selectDestination(p)));
  box.classList.toggle("show",!!(j.results||[]).length);
 }catch(e){status("Adres araması şu anda kullanılamıyor. Lütfen tekrar deneyin.")}
}
async function locate(){
 const b=dialog("Konumumu Bul");b.append(make("p","Konum izni kontrol ediliyor…","ru-muted"));
 if(!navigator.geolocation){b.replaceChildren(make("p","Cihazınız konum hizmetini desteklemiyor.","ru-error"));return}
 navigator.geolocation.getCurrentPosition(async pos=>{
  const p={lat:pos.coords.latitude,lng:pos.coords.longitude,label:"Mevcut konumum"};
  try{pickup=p}catch(e){}
  const current=q("currentAddr");if(current)current.textContent="Konumunuz alındı";
  const pi=q("pickupInput");if(pi)pi.value=p.label;
  const mapNote=q("r33Note");if(mapNote)mapNote.textContent="Konumunuz";
  b.replaceChildren(make("p","Alış konumu belirlendi.","ru-muted"));
  const t=readRide().t;if(t)try{await fetchRoute(p,t)}catch(e){errorTo(b,e)}
 },e=>{b.replaceChildren(make("p",e.code===1?"Konum izni verilmedi. Tarayıcıdan konuma izin verin.":"Konum bulunamadı. Tekrar deneyin.","ru-error"))},{enableHighAccuracy:true,timeout:15000,maximumAge:2000});
}
function clearTrip(){
 localStorage.removeItem("rota_active_trip_id");localStorage.removeItem("rota_trip_id");localStorage.removeItem("rota_pickup_code");
 if(polling){clearInterval(polling);polling=0}
 if(q("r33Code"))q("r33Code").textContent="—";
 if(q("rotaRideCode"))q("rotaRideCode").textContent="";
}
async function pollTrip(){
 const tid=tripId();if(!tid){if(polling){clearInterval(polling);polling=0}return}
 try{
  const j=await api("customer-trip-code",{tripId:tid});
  if(j.status==="cancelled"||j.status==="completed"){clearTrip();status(j.status==="completed"?"Yolculuk tamamlandı.":"Çağrı iptal edildi.");return}
  if(j.status==="accepted"){
   status("Sürücü size geliyor.");
   if(j.pickupCode){if(q("rotaRideCode"))q("rotaRideCode").textContent=j.pickupCode;if(q("r33Code"))q("r33Code").textContent=j.pickupCode}
   if(j.etaMinutes!=null && q("r33Eta"))q("r33Eta").textContent=j.etaMinutes+" dk";
  }else{status("Sürücü aranıyor… Yakındaki sürücülere çağrı gönderildi.");}
 }catch(e){status("Çağrı durumu kontrol edilemedi: "+e.message)}
}
function startPoll(){
 if(polling)clearInterval(polling);
 pollTrip();polling=setInterval(pollTrip,3500);
}
async function callVehicle(){
 if(sending)return;
 let ride=readRide();
 if(!ride.p||!ride.t||!Number.isFinite(Number(ride.p.lat))||!Number.isFinite(Number(ride.t.lat))){
  note("Araç Çağır","Önce alış ve varış adreslerini seçin. Konumunuzu haritadaki konum düğmesinden belirleyebilirsiniz.");return
 }
 if(!ride.d)try{ride.d=await fetchRoute(ride.p,ride.t)}catch(e){note("Güzergâh",e.message);return}
 if(!creds().accountId||!creds().sessionToken){note("Oturum Gerekli","Giriş oturumu bulunamadı. Lütfen yeniden giriş yapın.");return}
 if(tripId()){note("Aktif Çağrı","Zaten aktif bir çağrınız var. Yeni çağrıdan önce mevcut yolculuğu tamamlayın veya iptal edin.");return}
 const body=dialog("Yolculuğu Onayla");
 body.append(make("p",ride.description));
 body.append(make("p",ride.d.toFixed(1)+" km • Tahmini ücret "+Math.round(ride.d*27)+" TL"));
 body.append(make("p",ride.v+" • Ücret, güzergâh durumuna göre değişebilir.","ru-muted"));
 const actions=make("div",undefined,"ru-row");
 const no=make("button","Vazgeç","ru-btn ru-alt"),yes=make("button","Sürücü Çağır","ru-btn");
 const feedback=make("p",undefined,"ru-error");
 no.onclick=()=>q("rotaUiDialog").classList.remove("show");
 yes.onclick=async()=>{
  if(sending)return;sending=true;yes.disabled=true;feedback.textContent="Sürücü aranıyor…";
  try{
   const c=creds();
   const pay=q("paymentMethod")?.value||"cash";
   const promo=q("promoInput")?.value?.trim()||"";
   const j=await api("match",{
    pickup:ride.p,target:ride.t,destination:ride.description,vehicle:ride.v,
    distanceKm:ride.d,fare:Math.round(ride.d*27),paymentMethod:pay,
    promoCode:promo,customerAccountId:c.accountId,customerSessionToken:c.sessionToken,womenDriver:false
   });
   if(!j.tripId)throw Error("Çağrı numarası alınamadı. Tekrar kontrol edin.");
   localStorage.setItem("rota_active_trip_id",j.tripId);
   localStorage.setItem("rota_trip_id",j.tripId);
   q("rotaUiDialog")?.classList.remove("show");
   status("Sürücü aranıyor… Yakındaki sürücülere çağrı gönderildi.");
   startPoll();
  }catch(e){feedback.textContent=e.message}
  finally{sending=false;yes.disabled=false}
 };
 actions.append(no,yes);body.append(actions,feedback);
}
async function cancelVehicle(){
 const tid=tripId();
 if(!tid){note("Çağrıyı İptal Et","Şu anda iptal edilecek aktif bir çağrınız bulunmuyor.");return}
 const b=dialog("Çağrıyı İptal Et");
 b.append(make("p","Mevcut sürücü çağrınızı iptal etmek istiyor musunuz?"));
 const row=make("div",undefined,"ru-row"),stay=make("button","Vazgeç","ru-btn ru-alt"),go=make("button","Çağrıyı İptal Et","ru-btn");
 const info=make("p",undefined,"ru-error");
 stay.onclick=()=>q("rotaUiDialog").classList.remove("show");
 go.onclick=async()=>{
  go.disabled=true;info.textContent="İptal ediliyor…";
  try{
   await api("customer-cancel-trip",{tripId:tid,cancelReason:"Yolcu tarafından iptal"});
   clearTrip();q("rotaUiDialog")?.classList.remove("show");status("Çağrı iptal edildi. Yeni araç çağırabilirsiniz.");
   if(q("result"))q("result").textContent="Çağrı iptal edildi.";
  }catch(e){info.textContent=e.message;go.disabled=false}
 };
 row.append(stay,go);b.append(row,info);
}
async function chat(){
 const tid=tripId();
 if(!tid){note("Mesaj Gönder","Mesajlaşmak için önce bir sürücüyle eşleşmeniz gerekiyor.");return}
 const b=dialog("Sürücüyle Mesajlaşma");
 const messages=make("div",undefined,"ru-messages"),input=make("input"),row=make("div",undefined,"ru-row"),send=make("button","Gönder","ru-btn"),info=make("p",undefined,"ru-error");
 input.placeholder="Mesajınızı yazın";input.maxLength=500;
 row.append(input,send);b.append(messages,row,info);
 let loading=false;
 async function refresh(){
  if(loading||!q("rotaUiDialog")?.classList.contains("show"))return;
  loading=true;
  try{
   const j=await api("trip-chat-list",{role:"customer",tripId:tid});
   messages.replaceChildren();
   (j.messages||[]).forEach(m=>messages.append(make("div",m.body||"",m.sender_role==="customer"?"ru-message me":"ru-message")));
   messages.scrollTop=messages.scrollHeight;
  }catch(e){info.textContent=e.message}
  finally{loading=false}
 }
 send.onclick=async()=>{
  if(!input.value.trim()){info.textContent="Mesajınızı yazın.";return}
  send.disabled=true;info.textContent="";
  try{await api("trip-chat-send",{role:"customer",tripId:tid,message:input.value.trim()});input.value="";await refresh()}
  catch(e){info.textContent=e.message}
  finally{send.disabled=false}
 };
 input.onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();send.click()}};
 await refresh();
 if(chatTimer)clearInterval(chatTimer);
 chatTimer=setInterval(()=>{if(!q("rotaUiDialog")?.classList.contains("show")){clearInterval(chatTimer);chatTimer=0;return}refresh()},5000);
}
function onClick(e){
 const node=e.target instanceof Element?e.target:null;if(!node)return;
 const btn=node.closest("button");if(!btn)return;
 const match=selector=>btn.matches(selector)||!!btn.closest(selector);
 if(match("#r33Reserve")){
  e.preventDefault();e.stopImmediatePropagation();
  moveModals();
  const m=q("rotaReservationModal");
  if(!m){note("Rezervasyon Yap","Rezervasyon formu yüklenemedi. Sayfayı yenileyip tekrar deneyin.");return}
  m.classList.add("show");m.style.removeProperty("display");
  q("r33Drawer")?.classList.remove("open");q("r33Back")?.classList.remove("open");
  q("rrPickup")?.focus({preventScroll:true});
  return;
 }
 if(match("#r33Msg")){e.preventDefault();e.stopImmediatePropagation();chat();return}
 if(match("#r33Cancel")){e.preventDefault();e.stopImmediatePropagation();cancelVehicle();return}
 if(match("#call")){e.preventDefault();e.stopImmediatePropagation();callVehicle();return}
 if(match("#r33Locate")){e.preventDefault();e.stopImmediatePropagation();locate();return}
 if(btn.closest("#rotaDesign33 .r33-card")&&(btn.closest(".r33-row")||btn.closest(".r33-title"))){
  e.preventDefault();e.stopImmediatePropagation();favorites();return;
 }
 if(btn.closest("#rotaDesign33 .r33-head")&&!btn.id&&!btn.closest("#r33Menu")){
  e.preventDefault();e.stopImmediatePropagation();
  const item=Array.from(document.querySelectorAll("#r33Drawer .r33-ditem")).find(x=>(x.textContent||"").includes("Bildirimler"));
  if(item)item.click();else note("Bildirimler","Yeni bildirim bulunmuyor.");
  return;
 }
 if(btn.matches("#r33Vehicles .v")){
  const v=btn.dataset.v;if(v){try{vehicle=v}catch(e){}
   document.querySelectorAll("#r33Vehicles .v").forEach(x=>x.classList.toggle("on",x===btn))}
 }
}
document.addEventListener("click",onClick,true);
document.addEventListener("input",e=>{
 if(e.target?.id==="dest"){clearTimeout(searchTimeout);searchTimeout=setTimeout(searchFallback,620)}
});
window.addEventListener("load",()=>{moveModals();if(tripId())startPoll();});
})();