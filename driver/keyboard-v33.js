(function(){
"use strict";
if(window.__rotaPin33)return;
window.__rotaPin33=true;
const css=document.createElement("style");
css.textContent=[
"#rotaPinShade33{position:fixed;inset:0;background:#07152ab5;z-index:2147482990;display:none}",
"#rotaPin33{position:fixed;left:10px;right:10px;bottom:calc(12px + env(safe-area-inset-bottom));margin:auto;max-width:420px;background:#fff;border-radius:18px;padding:15px;box-shadow:0 8px 35px #0005;z-index:2147483000;display:none;color:#10223d;box-sizing:border-box;font:16px system-ui,Arial}",
"#rotaPinShade33.open,#rotaPin33.open{display:block!important}",
"#rotaPin33 .display{background:#eff4fb;text-align:center;font-size:26px;font-weight:800;letter-spacing:10px;border-radius:11px;padding:11px;margin:10px 0}",
"#rotaPin33 .keys{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}",
"#rotaPin33 button{border:0;min-height:47px;border-radius:9px;background:#eaf0f8;color:#10223d;font:800 22px system-ui;touch-action:manipulation}",
"#rotaPin33 .confirm{grid-column:span 3;background:#d3000d;color:white;font-size:17px}",
"#rotaPin33 .top{display:flex;align-items:center;justify-content:space-between;font-weight:800}",
"#rotaPin33 .close{background:transparent;font-size:22px}",
".rotaPinLaunch33{border:1px solid #d3000d!important;color:#d3000d!important;background:#fff!important;border-radius:8px!important;padding:10px!important;margin-left:6px!important;min-height:39px!important;font-size:13px!important;font-weight:800!important}",
"@media(max-height:600px){#rotaPin33{padding:9px}#rotaPin33 button{min-height:37px}#rotaPin33 .display{padding:5px;margin:5px 0}}"
].join("\n");
document.head.appendChild(css);
const shade=document.createElement("div");shade.id="rotaPinShade33";
const panel=document.createElement("section");panel.id="rotaPin33";
panel.innerHTML='<div class="top">Yolcu Kodu <button type="button" class="close">✕</button></div><div class="display">○ ○ ○ ○</div><div class="keys">'+["1","2","3","4","5","6","7","8","9","Sil","0","←"].map(k=>'<button type="button" data-key="'+k+'">'+k+'</button>').join("")+'<button type="button" class="confirm">Kodu Doğrula</button></div>';
document.body.append(shade,panel);
let input=null,verify=null,code="";
const display=panel.querySelector(".display");
function close(){panel.classList.remove("open");shade.classList.remove("open");input=null;verify=null;code=""}
function draw(){display.textContent=(code+"○".repeat(4-code.length)).split("").join(" ")}
function show(inp,btn){
input=inp;verify=btn;code=String(inp.value||"").replace(/\D/g,"").slice(0,4);
try{document.activeElement?.blur()}catch(e){}
draw();shade.classList.add("open");panel.classList.add("open");
}
function submit(){
if(!input?.isConnected || !verify?.isConnected){close();return}
if(code.length!==4){display.textContent="4 rakam girin";return}
const i=input,b=verify,v=code;close();
i.value=v;i.dispatchEvent(new Event("input",{bubbles:true}));i.dispatchEvent(new Event("change",{bubbles:true}));b.click();
}
shade.addEventListener("click",close);
panel.addEventListener("click",e=>{
const button=e.target.closest("button");if(!button)return;
if(button.classList.contains("close"))return close();
if(button.classList.contains("confirm"))return submit();
const key=button.dataset.key;
if(key==="Sil")code="";else if(key==="←")code=code.slice(0,-1);else if(/^\d$/.test(key)&&code.length<4)code+=key;draw();
});
const wired=new WeakSet();
function scan(){
document.querySelectorAll("input").forEach(i=>{
if(wired.has(i) || panel.contains(i))return;
const ph=String(i.placeholder||"");
if(!/4\s*haneli\s*kod|yolcu\s*kodu/i.test(ph))return;
let parent=i.parentElement,btn=null;
for(let n=0;parent&&n<5;n++,parent=parent.parentElement){
btn=[...parent.querySelectorAll("button")].find(x=>/^doğrula$/i.test((x.textContent||"").trim()));
if(btn)break;
}
if(!btn)return;
wired.add(i);
i.readOnly=true;
i.setAttribute("inputmode","none");
i.style.cursor="pointer";
const launch=document.createElement("button");
launch.type="button";launch.className="rotaPinLaunch33";launch.textContent="🔢 Kodu Gir";
launch.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();show(i,btn)});
i.insertAdjacentElement("afterend",launch);
i.addEventListener("click",e=>{e.preventDefault();show(i,btn)});
i.addEventListener("focus",()=>{try{i.blur()}catch(e){};show(i,btn)});
});
}
scan();
const observer=new MutationObserver(()=>{if(!window.__rotaPinScanScheduled33){window.__rotaPinScanScheduled33=true;requestAnimationFrame(()=>{window.__rotaPinScanScheduled33=false;scan()})}});
observer.observe(document.body,{childList:true,subtree:true});
setInterval(scan,2500);
})();