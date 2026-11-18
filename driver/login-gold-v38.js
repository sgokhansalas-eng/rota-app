/* ROTA Sürücü: onaylanan lacivert/altın giriş tasarımı. Existing login event handlers stay intact. */
(function(){
"use strict";
if(window.__rotaDriverLogin38)return;
window.__rotaDriverLogin38=true;
// Hide only the legacy auth panel while the approved design is being attached.
document.documentElement.classList.add("rota-login38-pending");
const css=document.createElement("style");css.id="rotaLogin38CSS";
css.textContent=[
"html.rota-login38-pending #rotaDriverAuth:not(.rota-login38){visibility:hidden!important}",
"#rotaDriverAuth.rota-login38{background:radial-gradient(ellipse at 75% 8%,#254778 0,transparent 45%),linear-gradient(150deg,#061329 5%,#102b55 67%,#07172e 100%)!important;color:white!important;overflow-y:auto!important;overscroll-behavior:contain;align-items:center!important;justify-content:center!important;padding:24px 14px calc(24px + env(safe-area-inset-bottom))!important;box-sizing:border-box!important}",
"#rotaDriverAuth.rota-login38:before{content:'ROTA';display:block!important;color:white!important;font:900 clamp(36px,8vw,56px) system-ui,Arial!important;letter-spacing:-3px;text-align:center;text-shadow:0 4px 16px #0004;margin:0 auto 6px;line-height:1.1}",
"#rotaDriverAuth.rota-login38 .rota-login-card38{background:linear-gradient(160deg,#152b4e 5%,#08172c 100%)!important;color:white!important;border:1px solid #f8c95e66!important;border-radius:24px!important;box-shadow:0 16px 45px #010e2399!important;padding:25px 22px!important;width:min(100%,440px)!important;max-width:440px!important;box-sizing:border-box!important;margin:8px auto!important}",
"#rotaDriverAuth.rota-login38 .rota-login-card38 h1,#rotaDriverAuth.rota-login38 .rota-login-card38 h2{color:white!important;font-size:clamp(25px,5.8vw,31px)!important;font-weight:850!important;letter-spacing:-.4px!important;margin:0 0 21px!important;text-align:center}",
"#rotaDriverAuth.rota-login38 .rota-login-card38 input:not([type=hidden]):not([type=checkbox]){display:block!important;background:#ffffff13!important;color:white!important;border:1px solid #cdd8ec91!important;border-radius:13px!important;width:100%!important;min-height:54px!important;padding:12px 14px!important;font-size:16px!important;box-sizing:border-box!important;outline:0!important;box-shadow:none!important;margin-bottom:12px!important}",
"#rotaDriverAuth.rota-login38 .rota-login-card38 input::placeholder{color:#d4dff0!important;opacity:.92!important}",
"#rotaDriverAuth.rota-login38 .rota-login-card38 input:focus{border-color:#ffd76c!important;box-shadow:0 0 0 3px #ffcb4435!important}",
"#rotaDriverAuth.rota-login38 .rota-login-card38 .rota-pass-wrap38{position:relative!important;width:100%!important}",
"#rotaDriverAuth.rota-login38 .rota-login-card38 .rota-pass-wrap38 input{padding-right:83px!important}",
"#rotaDriverAuth.rota-login38 .rota-login-card38 .rota-pass-toggle38{position:absolute!important;right:6px!important;top:5px!important;min-height:43px!important;width:auto!important;padding:0 12px!important;border-radius:10px!important;background:#ffffff23!important;border:0!important;color:#fff!important;font:750 12px system-ui,Arial!important;box-shadow:none!important}",
"#rotaDriverAuth.rota-login38 .rota-login-card38 .rota-login-submit38{display:block!important;width:100%!important;min-height:56px!important;border-radius:14px!important;border:0!important;background:linear-gradient(105deg,#f9b624,#ffdb73 68%,#f8b522)!important;color:#091a33!important;font:850 19px system-ui,Arial!important;box-shadow:0 8px 20px #f1ad2940!important;margin:17px 0 7px!important}",
"#rotaDriverAuth.rota-login38 .rota-login-card38 .rota-login-note38{font:500 12px system-ui,Arial!important;color:#adbfda!important;text-align:center;margin:16px 0 0!important}",
"#rotaDriverAuth.rota-login38 .rota-login-card38 label,#rotaDriverAuth.rota-login38 .rota-login-card38 p{color:#dce7f8}",
"#rotaDriverAuth.rota-login38 .rota-login-brand38{font:700 13px system-ui,Arial;color:#f7c44f!important;text-align:center;letter-spacing:2px;margin:3px auto 13px}",
"@media(max-width:410px){#rotaDriverAuth.rota-login38 .rota-login-card38{padding:21px 16px!important}#rotaDriverAuth.rota-login38{padding-left:12px!important;padding-right:12px!important}}"
].join("\n");document.head.appendChild(css);
const done=new WeakSet();
function scan(){
const auth=document.getElementById("rotaDriverAuth");
if(!auth)return;
const pass=[...auth.querySelectorAll('input[type=password]')].find(x=>!done.has(x));
if(!pass)return;
let el=pass.parentElement,form=null,phone=null,btn=null;
for(let depth=0;el&&depth<7;depth++,el=el.parentElement){
const fields=[...el.querySelectorAll("input")];
phone=fields.find(x=>x!==pass&&/telefon|phone|numara|tel/i.test((x.placeholder||"")+" "+(x.name||"")+" "+(x.type||"")));
btn=[...el.querySelectorAll("button,input[type=submit]")].find(x=>/giriş\s*yap|login/i.test((x.textContent||x.value||"").trim()));
if(phone&&btn){form=el;break}
}
if(!form)return;
done.add(pass);
auth.classList.add("rota-login38");
document.documentElement.classList.remove("rota-login38-pending");
form.classList.add("rota-login-card38");
btn.classList.add("rota-login-submit38");
phone.setAttribute("autocomplete","tel");pass.setAttribute("autocomplete","current-password");
if(!form.querySelector(".rota-login-brand38")){
const brand=document.createElement("div");brand.className="rota-login-brand38";brand.textContent="SÜRÜCÜ UYGULAMASI";
form.insertBefore(brand,form.firstChild);
}
if(!pass.parentElement.classList.contains("rota-pass-wrap38")){
const wrapper=document.createElement("div");wrapper.className="rota-pass-wrap38";
pass.parentNode.insertBefore(wrapper,pass);wrapper.appendChild(pass);
const toggle=document.createElement("button");toggle.type="button";toggle.className="rota-pass-toggle38";toggle.textContent="Göster";toggle.setAttribute("aria-label","Şifreyi göster");
toggle.addEventListener("click",()=>{const hidden=pass.type==="password";pass.type=hidden?"text":"password";toggle.textContent=hidden?"Gizle":"Göster"});
wrapper.appendChild(toggle);
}
if(!form.querySelector(".rota-login-note38")){
const note=document.createElement("p");note.className="rota-login-note38";note.textContent="ROTA • Güvenli sürücü girişi";form.appendChild(note);
}
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",scan,{once:true});else scan();
window.addEventListener("load",scan);
const observer=new MutationObserver(()=>scan());
observer.observe(document.documentElement,{subtree:true,childList:true});
setTimeout(scan,50);setTimeout(scan,300);setTimeout(scan,700);setTimeout(scan,1800);
// Safety fallback: never leave login hidden if the markup changes.
setTimeout(()=>{document.documentElement.classList.remove("rota-login38-pending");observer.disconnect()},4000);
})();