(function(){
"use strict";
if(window.__rotaTripsVisible36)return;
window.__rotaTripsVisible36=true;
const css=document.createElement("style");
css.id="rota-trips-visible-v36";
css.textContent=[
"#rotaTripsJump36{display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:8px 13px;border-radius:11px;border:1px solid #d31c25;background:#fff;color:#b20f19;font:700 13px system-ui,Arial;cursor:pointer;touch-action:manipulation}",
"#rotaFinal17 .rfd-card.rotaTripsCard36{display:block!important;visibility:visible!important;height:auto!important;min-height:130px!important;max-height:none!important;overflow:visible!important;opacity:1!important}",
"#rotaFinal17 .rotaTripsCard36 #r29Trips,#rotaFinal17 .rotaTripsCard36 #r28Trips{display:block!important;visibility:visible!important;height:auto!important;min-height:42px!important;max-height:180px!important;overflow-y:auto!important;overscroll-behavior:contain}"
].join("\n");
document.head.appendChild(css);
function findCard(){
const root=document.querySelector("#rotaFinal17")||document;
for(const el of root.querySelectorAll("h1,h2,h3,h4,div")){
 const title=(el.textContent||"").trim().replace(/\s+/g," ");
 if(/^Seferlerim\s*\(Bugün\)$/i.test(title))return el.closest(".rfd-card")||el.parentElement;
}
return null;
}
function setup(){
const root=document.querySelector("#rotaFinal17");if(!root)return;
const card=findCard();if(!card)return;
card.classList.add("rotaTripsCard36");
if(document.getElementById("rotaTripsJump36"))return;
const button=document.createElement("button");
button.id="rotaTripsJump36";button.type="button";button.textContent="🚘 Seferlerim";
button.onclick=()=>card.scrollIntoView({behavior:"smooth",block:"start"});
const bar=[...root.querySelectorAll("button")].find(b=>/Gelen Talepler/i.test((b.textContent||"").trim()));
if(bar&&bar.parentElement){
 const wrap=document.createElement("div");wrap.style.cssText="display:flex;justify-content:flex-end;padding:6px 12px 0";
 wrap.appendChild(button);bar.parentElement.insertAdjacentElement("afterend",wrap);
}else card.insertAdjacentElement("beforebegin",button);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",setup,{once:true});else setup();
window.addEventListener("load",setup);
setTimeout(setup,1400);
setTimeout(setup,4000);
})();