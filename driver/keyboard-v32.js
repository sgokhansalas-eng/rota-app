/* ROTA Driver: on-screen pickup PIN keypad, no mobile software keyboard. */
(function(){
"use strict";
if(window.__rotaPinKeypad32)return;
window.__rotaPinKeypad32=true;
const css=document.createElement("style");
css.id="rotaPinKeypad32Style";
css.textContent=[
"#rotaPinBackdrop32{display:none;position:fixed;inset:0;z-index:2147482990;background:#09172b94;overscroll-behavior:contain}",
"#rotaPinBackdrop32.open{display:block!important}",
"#rotaPinPad32{display:none;position:fixed;z-index:2147483000;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));max-width:440px;margin:0 auto;background:#fff;border-radius:19px;padding:18px 18px 16px;box-shadow:0 10px 45px #0005;box-sizing:border-box;font-family:system-ui,Arial,sans-serif;color:#0c2340}",
"#rotaPinPad32.open{display:block!important}",
"#rotaPinPad32 .r32top{display:flex;align-items:center;justify-content:space-between;gap:8px}",
"#rotaPinPad32 h2{font-size:18px;font-weight:800;margin:0 0 10px}",
"#rotaPinPad32 .r32code{background:#f0f4fa;text-align:center;letter-spacing:9px;border-radius:12px;min-height:48px;padding:12px 8px;font-size:24px;font-weight:900;margin-bottom:10px}",
"#rotaPinPad32 .r32grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}",
"#rotaPinPad32 button{min-height:48px;touch-action:manipulation;border:0;border-radius:11px;background:#eaf0f8;color:#10284c;font:800 21px system-ui,Arial,sans-serif}",
"#rotaPinPad32 button.r32del{font-size:16px}",
"#rotaPinPad32 button.r32confirm{background:#d10011;color:#fff;grid-column:span 3;font-size:17px}",
"#rotaPinPad32 button.r32close{background:transparent;color:#5f7088;min-height:32px;font-size:18px;min-width:32px}",
"#rotaPinPad32 .r32help{font-size:11px;color:#526987;margin:7px 0 0}",
"@media(max-height:570px){#rotaPinPad32{padding:9px 12px}#rotaPinPad32 button{min-height:36px}#rotaPinPad32 h2{font-size:15px;margin-bottom:4px}#rotaPinPad32 .r32code{min-height:35px;padding:5px;margin-bottom:6px;font-size:19px}#rotaPinPad32 .r32grid{gap:4px}}"
].join("\n");
document.head.appendChild(css);
const shade=document.createElement("div");shade.id="rotaPinBackdrop32";document.body.appendChild(shade);
const pad=document.createElement("section");pad.id="rotaPinPad32";pad.setAttribute("aria-label","Yolcu 4 haneli kod");pad.innerHTML=
'<div class="r32top"><h2>Yolcu kodu doğrulama</h2><button class="r32close" type="button" aria-label="Kapat">✕</button></div>'+
'<div class="r32code" aria-live="polite">○ ○ ○ ○</div>'+
'<div class="r32grid">'+['1','2','3','4','5','6','7','8','9','Sil','0','←'].map(x=>'<button type="button" data-key="'+x+'"'+(x==='Sil'||x==='←'?' class="r32del"':'')+'>'+x+'</button>').join('')+
'<button class="r32confirm" type="button">Kodu Doğrula</button></div><p class="r32help">Telefon klavyesi açılmadan kodu buradan girin.</p>';
document.body.appendChild(pad);
const text=pad.querySelector(".r32code"), confirm=pad.querySelector(".r32confirm");
let source=null, verify=null, digits="";
function target(input){
return input instanceof HTMLInputElement && !pad.contains(input) && 
(/4\s*haneli\s*kod|yolcu\s*kodu/i.test(input.placeholder||"")||
(/code|pickup|otp/i.test(input.id||"")&&input.maxLength===4));
}
function findButton(input){
let node=input.parentElement;
for(let n=0;node&&n<5;n++,node=node.parentElement){
const found=[...node.querySelectorAll("button")].find(b=>/^doğrula$/i.test((b.textContent||"").trim()));
if(found)return found;
}
return null;
}
function draw(){text.textContent=(digits+"○".repeat(4)).split("").join(" ")}
function close(){shade.classList.remove("open");pad.classList.remove("open");source=null;verify=null;digits=""}
function open(input){
const button=findButton(input);
if(!button)return;
source=input;verify=button;digits=String(input.value||"").replace(/\D/g,"").slice(0,4);
input.setAttribute("readonly","readonly");
input.blur();
draw();shade.classList.add("open");pad.classList.add("open");
}
function submit(){
if(!source||!verify||!source.isConnected){close();return}
if(digits.length!==4){text.textContent="4 rakam girin";return}
const input=source,button=verify,val=digits;
input.value=val;
input.dispatchEvent(new Event("input",{bubbles:true}));
input.dispatchEvent(new Event("change",{bubbles:true}));
close();
button.click();
}
pad.addEventListener("click",e=>{
const b=e.target.closest("button");if(!b)return;
if(b.classList.contains("r32close")){close();return}
if(b.classList.contains("r32confirm")){submit();return}
const k=b.dataset.key;
if(k==="Sil"){digits=""}else if(k==="←"){digits=digits.slice(0,-1)}
else if(/^\d$/.test(k)&&digits.length<4)digits+=k;
draw();
});
shade.addEventListener("click",close);
document.addEventListener("pointerdown", e=>{
if(target(e.target)&&findButton(e.target)){
e.preventDefault();
open(e.target);
}
},true);
document.addEventListener("click",e=>{
if(target(e.target)&&findButton(e.target)){
e.preventDefault();e.stopPropagation();open(e.target);
}
},true);
document.addEventListener("focusin",e=>{
if(target(e.target)&&findButton(e.target)){
open(e.target);
}
},true);
})();
