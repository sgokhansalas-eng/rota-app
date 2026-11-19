/* ROTA customer dashboard repair: keep ride backend unchanged; link menu to supported APIs. */
(function(){
"use strict";
if(window.__rotaCustomerNavRepair)return;
window.__rotaCustomerNavRepair=true;
const API="https://ftltemgtzkjfnkxsxxmd.supabase.co/functions/v1/rota2-core";
const $=id=>document.getElementById(id);
function credentials(){
 return {
  accountId:localStorage.getItem("rota_customer_account_id")||"",
  sessionToken:localStorage.getItem("rota_customer_session")||""
 };
}
async function api(action,extra){
 const c=credentials();
 if(!c.accountId||!c.sessionToken)throw Error("Oturum bilgisi bulunamadı. Lütfen yeniden giriş yapın.");
 const response=await fetch(API+"?action="+encodeURIComponent(action),{
  method:"POST",headers:{"Content-Type":"application/json"},
  body:JSON.stringify(Object.assign({},c,extra||{}))
 });
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(data.error||"Bilgiler alınamadı.");
 return data;
}
function elem(tag,text,cls){
 const node=document.createElement(tag);
 if(text!==undefined)node.textContent=String(text);
 if(cls)node.className=cls;
 return node;
}
function initModal(){
 let modal=$("rotaNavFixModal");
 if(modal)return modal;
 modal=elem("div",undefined,"rotaNavFixModal");modal.id="rotaNavFixModal";
 const panel=elem("section",undefined,"rotaNavFixPanel");
 const head=elem("div",undefined,"rotaNavFixHead");
 const title=elem("strong","ROTA");title.id="rotaNavFixTitle";
 const close=elem("button","×");close.type="button";close.setAttribute("aria-label","Kapat");
 close.onclick=()=>modal.classList.remove("show");
 head.append(title,close);
 const body=elem("div",undefined,"rotaNavFixBody");body.id="rotaNavFixBody";
 panel.append(head,body);modal.appendChild(panel);
 modal.addEventListener("click",e=>{if(e.target===modal)modal.classList.remove("show")});
 document.body.appendChild(modal);
 const style=document.createElement("style");
 style.textContent=".rotaNavFixModal{position:fixed;inset:0;z-index:70000;display:none;background:#061529bd;padding:18px;align-items:center;justify-content:center}.rotaNavFixModal.show{display:flex}.rotaNavFixPanel{background:white;color:#12243c;width:min(100%,480px);max-height:88dvh;overflow:auto;border-radius:20px;box-shadow:0 10px 40px #0005}.rotaNavFixHead{position:sticky;top:0;background:#102d5e;color:#fff;display:flex;justify-content:space-between;align-items:center;padding:15px 18px;z-index:2}.rotaNavFixHead button{color:white;background:transparent;border:0;font-size:28px}.rotaNavFixBody{padding:16px;min-height:80px}.rotaNavFixCard{padding:13px 10px;border:1px solid #e2e8f0;border-radius:11px;margin:8px 0}.rotaNavFixCard small{display:block;color:#64748b;margin-top:5px}.rotaNavFixBody input,.rotaNavFixBody select{display:block;width:100%;box-sizing:border-box;border:1px solid #ccd5e2;border-radius:10px;padding:13px;margin:10px 0;font-size:16px}.rotaNavFixPrimary{background:#0b4e9d;color:#fff;border:0;border-radius:11px;padding:13px;width:100%;font-size:16px;font-weight:800}.rotaNavFixBody label{display:block;margin-top:8px}.rotaNavFixMuted{color:#64748b}.rotaNavFixError{color:#b91c1c}";
 document.head.appendChild(style);
 return modal;
}
function open(title){
 const modal=initModal();
 $("rotaNavFixTitle").textContent=title;
 const body=$("rotaNavFixBody");body.replaceChildren(elem("p","Yükleniyor…","rotaNavFixMuted"));
 modal.classList.add("show");
 const drawer=$("r33Drawer");if(drawer)drawer.classList.remove("open");
 const back=$("r33Back");if(back)back.classList.remove("open");
 return body;
}
function error(body,e){body.replaceChildren(elem("p",e.message||String(e),"rotaNavFixError"))}
function card(body,title,detail,extra){
 const c=elem("article",undefined,"rotaNavFixCard");
 c.appendChild(elem("strong",title));
 if(detail)c.appendChild(elem("small",detail));
 if(extra)c.appendChild(elem("small",extra));
 body.appendChild(c);
}
async function trips(mode){
 const isReservations=mode==="reservations";
 const body=open(isReservations?"Rezervasyonlarım":"Yolculuklarım");
 try{
  const res=await api(isReservations?"customer-reservations":"customer-trips");
  const rows=isReservations?(res.reservations||[]):(res.trips||[]);
  body.replaceChildren();
  if(!rows.length){body.appendChild(elem("p",isReservations?"Henüz rezervasyonunuz yok.":"Henüz yolculuğunuz yok.","rotaNavFixMuted"));return}
  rows.forEach(row=>{
   let date=row.scheduled_at||row.created_at||"";
   try{date=new Date(date).toLocaleString("tr-TR")}catch(e){}
   card(body,row.destination||"Yolculuk",(row.pickup_label?row.pickup_label+" • ":"")+(row.status||"")+" • "+date,(row.vehicle||"")+(row.fare!=null?" • ₺"+row.fare:""));
  });
 }catch(e){error(body,e)}
}
async function favorites(){
 const body=open("Kayıtlı Konumlarım");
 try{
  const res=await api("customer-favorites");
  body.replaceChildren();
  if(!(res.favorites||[]).length){body.appendChild(elem("p","Henüz kayıtlı konumunuz yok.","rotaNavFixMuted"));return}
  res.favorites.forEach(x=>card(body,x.label||"Konum",x.address||"",x.kind||""));
 }catch(e){error(body,e)}
}
async function settings(){
 const body=open("Yolculuk Tercihleri");
 try{
  const resp=await api("customer-settings"),s=resp.settings||{};
  body.replaceChildren();
  body.appendChild(elem("label","Ödeme yöntemi"));
  const select=elem("select");[["cash","Nakit"],["iban","IBAN"],["card","Kart"]].forEach(([value,label])=>{
   const o=elem("option",label);o.value=value;select.append(o);
  });
  select.value=s.payment_method||"cash";body.append(select);
  const quiet=elem("input");quiet.type="checkbox";quiet.checked=!!s.quiet_ride;quiet.style.width="auto";
  const quietLabel=elem("label","Sessiz yolculuk");quietLabel.prepend(quiet);body.append(quietLabel);
  const phone=elem("input");phone.type="tel";phone.placeholder="Acil durum telefonu";phone.value=s.emergency_phone||"";body.append(phone);
  const save=elem("button","Kaydet","rotaNavFixPrimary");body.append(save);
  const msg=elem("p");msg.setAttribute("role","status");body.append(msg);
  save.onclick=async()=>{
   save.disabled=true;msg.textContent="Kaydediliyor...";
   try{
    await api("save-customer-settings",{paymentMethod:select.value,quietRide:quiet.checked,emergencyPhone:phone.value,corporateId:s.corporate_id||""});
    msg.textContent="Tercihleriniz kaydedildi.";
   }catch(e){msg.textContent=e.message}finally{save.disabled=false}
  };
 }catch(e){error(body,e)}
}
async function promos(){
 const body=open("İndirimler");
 body.replaceChildren(elem("p","İndirim kodunuzu kontrol edebilirsiniz. Geçerli indirim yolculuk ücretine göre hesaplanır.","rotaNavFixMuted"));
 const input=elem("input");input.placeholder="İndirim kodu";body.append(input);
 const btn=elem("button","Kodu Kontrol Et","rotaNavFixPrimary");body.append(btn);
 const msg=elem("p");msg.setAttribute("role","status");body.append(msg);
 btn.onclick=async()=>{
  if(!input.value.trim()){msg.textContent="Kod girin.";return}
  btn.disabled=true;
  try{
   const res=await api("validate-promo",{code:input.value.trim().toUpperCase(),fare:0});
   msg.textContent="Kod geçerli. İndirim oranı: %"+(res.discountPercent||0)+". Tutar, yolculuk seçildiğinde hesaplanır.";
  }catch(e){msg.textContent=e.message}finally{btn.disabled=false}
 };
}
async function notifications(){
 const body=open("Yolculuk Bildirimleri");
 try{
  const r=await api("customer-trips");body.replaceChildren();
  const rows=(r.trips||[]).slice(0,10);
  if(!rows.length){body.appendChild(elem("p","Görüntülenecek yolculuk bildirimi yok.","rotaNavFixMuted"));return}
  rows.forEach(x=>card(body,x.destination||"Yolculuk",x.status||"",x.created_at?new Date(x.created_at).toLocaleString("tr-TR"):""));
 }catch(e){error(body,e)}
}
function routeMenu(label){
 if(label.includes("Yolculuklar")){trips("trips");return true}
 if(label.includes("Rezervasyonlar")){trips("reservations");return true}
 if(label.includes("İndirim")){promos();return true}
 if(label.includes("Bildirim")){notifications();return true}
 if(label.includes("Tercih")){settings();return true}
 if(label.includes("Sürücü Olmak")){window.location.href="https://rota-surucu-giris-guncel.onrender.com";return true}
 return false;
}
function bind(){
 const reserve=$("r33Reserve"),reserveModal=$("rotaReservationModal");
 if(reserve&&reserveModal&&!reserve.dataset.rotaDirectReservation){
  reserve.dataset.rotaDirectReservation="1";
  reserve.addEventListener("click",e=>{
   e.preventDefault();e.stopImmediatePropagation();
   reserveModal.classList.add("show");reserveModal.style.display="";
   const input=$("rrPickup");if(input)input.focus({preventScroll:true});
  },true);
 }
 const drawer=$("r33Drawer");
 if(drawer&&!drawer.dataset.rotaNavBound){
  drawer.dataset.rotaNavBound="1";
  drawer.querySelectorAll(".r33-ditem").forEach(item=>{
   if(item.id==="r33Night")return;
   item.addEventListener("click",e=>{
    const label=item.textContent||"";
    // Only replace a click when this repair actually handles it.
    // Unrecognized items must retain the existing production handlers.
    if(!/Yolculuklar|Rezervasyonlar|İndirim|Bildirim|Tercih|Sürücü Olmak/.test(label))return;
    e.preventDefault();e.stopImmediatePropagation();
    routeMenu(label);
   },true);
  });
 }
 const saved=document.querySelector("#rotaDesign33 .r33-card");
 if(saved&&!saved.dataset.rotaSavedBound){
  saved.dataset.rotaSavedBound="1";
  saved.addEventListener("click",e=>{
   if(e.target.closest(".r33-row,.r33-title"))favorites();
  });
  saved.style.cursor="pointer";
 }
 const canvas=$("r33MapCanvas");
 if(canvas&&!canvas.dataset.rotaMapReadyNotice){
  canvas.dataset.rotaMapReadyNotice="1";
  const note=$("r33Note");
  if(note&&!window.L&&!(window.google&&google.maps))note.textContent="Harita yüklenemedi. Sayfayı yenileyin.";
 }
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bind,{once:true});else bind();
const observer=new MutationObserver(bind);
observer.observe(document.documentElement,{childList:true,subtree:true});
window.addEventListener("load",bind,{once:true});
})();