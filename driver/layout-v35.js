/* ROTA Sürücü: compact, stable mobile trip layout without changing trip actions. */
(function(){
"use strict";
if(window.__rotaCompact35)return;
window.__rotaCompact35=true;
const style=document.createElement("style");
style.id="rotaCompact35";
style.textContent=[
"html{scroll-padding-top:8px;overflow-anchor:auto!important}",
"body{overflow-x:hidden!important}",
"#rotaFinal17{width:100%;max-width:100vw;box-sizing:border-box}",
"#rotaFinal17 .rfd-card{margin-top:9px!important;margin-bottom:9px!important;padding:11px 13px!important;min-width:0!important}",
"#rotaFinal17 .rfd-card h3{font-size:16px!important;margin:0 0 8px!important}",
"#rotaFinal17 .leaflet-container{height:240px!important;min-height:200px!important;max-height:240px!important}",
"#rotaFinal17 .rfd-card .leaflet-container{border-radius:12px!important}",
"#r29Trips,#r28Trips{max-height:116px!important;overflow-y:auto!important;overscroll-behavior:contain!important}",
"#rotaFinal17 .leaflet-control-zoom a{min-width:35px;min-height:35px}",
"@media(min-width:700px){#rotaFinal17 .leaflet-container{height:330px!important;max-height:330px!important}}",
"@media(max-width:420px){#rotaFinal17 .rfd-card{padding:9px 11px!important}#rotaFinal17 .leaflet-container{height:210px!important;max-height:210px!important}}"
].join("\n");
document.head.appendChild(style);
let lastHuman=Date.now(), lastScroll=window.scrollY;
window.addEventListener("touchstart",()=>{lastHuman=Date.now();lastScroll=window.scrollY},{passive:true});
window.addEventListener("wheel",()=>{lastHuman=Date.now();lastScroll=window.scrollY},{passive:true});
window.addEventListener("keydown",()=>{lastHuman=Date.now();lastScroll=window.scrollY},{passive:true});
window.addEventListener("scroll",()=>{
  const y=window.scrollY;
  if(Date.now()-lastHuman<1200 || Math.abs(y-lastScroll)<90){lastScroll=y;return;}
  // If the dashboard moves the document without a user gesture, restore prior reading position.
  const saved=lastScroll;
  requestAnimationFrame(()=>{if(Date.now()-lastHuman>1200&&Math.abs(window.scrollY-saved)>85)window.scrollTo({top:saved,behavior:"instant"})});
},{passive:true});
})();