/* ROTA Sürücü premium login, visual layer only */
(function(){
"use strict";
if(window.__rotaLogin37)return;
window.__rotaLogin37=true;
const style=document.createElement("style");
style.id="rotaLogin37Styles";
style.textContent=[
".rota-login-premium37{--login-navy:#0b1935;--login-blue:#193864;--login-gold:#ffc222;box-sizing:border-box!important;}",
".rota-login-premium37.rota-login-shell37{background:linear-gradient(165deg,#edf3fc 0%,#f7f9fc 56%,#eef3fa 100%)!important;}",
".rota-login-premium37 .rota-login-form37{width:min(100%,440px)!important;max-width:440px!important;margin:20px auto!important;padding:28px 24px 24px!important;background:#fff!important;border:1px solid #e6ecf5!important;border-radius:24px!important;box-shadow:0 18px 46px #152e5717!important;box-sizing:border-box!important;}",
".rota-login-premium37 .rota-login-form37 input:not([type=hidden]){display:block!important;width:100%!important;min-height:54px!important;border:1.5px solid #d5e0ed!important;border-radius:13px!important;background:#f9fbfe!important;color:#142440!important;font-size:16px!important;padding:12px 15px!important;margin-bottom:13px!important;box-sizing:border-box!important;box-shadow:none!important;outline:0!important;}",
".rota-login-premium37 .rota-login-form37 input:focus{border-color:#225ab4!important;box-shadow:0 0 0 3px #225ab421!important;background:#fff!important}",
".rota-login-premium37 .rota-login-form37 button.rota-login-submit37{background:linear-gradient(100deg,#0c2859,#1451a1)!important;color:#fff!important;border:0!important;border-radius:13px!important;min-height:54px!important;width:100%!important;font-weight:800!important;font-size:17px!important;box-shadow:0 9px 18px #174d9b24!important;}",
".rota-login-premium37 .rota-login-form37 h1,.rota-login-premium37 .rota-login-form37 h2{color:#10213e!important;font-weight:850!important;letter-spacing:-.025em!important;font-size:clamp(24px,5.6vw,30px)!important;margin:0 0 20px!important}",
".rota-login-premium37 .rota-login-form37 .rota-pass-wrap37{position:relative!important;min-width:0!important}",
".rota-login-premium37 .rota-login-form37 .rota-pass-wrap37 input{padding-right:83px!important}",
".rota-login-premium37 .rota-login-form37 .rota-pass-toggle37{position:absolute!important;right:8px!important;top:6px!important;height:42px!important;min-height:42px!important;padding:0 11px!important;background:#eaf1fb!important;color:#183968!important;border:0!important;border-radius:9px!important;font:700 12px system-ui,Arial!important;width:auto!important;box-shadow:none!important}",
".rota-login-caption37{text-align:center;color:#71829c;font:500 12px system-ui,Arial;margin-top:14px;line-height:1.45}",
".rota-login-premium37 .rota-login-header37{background:linear-gradient(115deg,#081831,#1d3f72)!important;border-radius:22px!important;box-shadow:0 12px 30px #0d284c24!important;overflow:hidden!important;}",
"@media(max-width:500px){.rota-login-premium37 .rota-login-form37{padding:24px 19px 20px!important;border-radius:21px!important;margin-top:15px!important}.rota-login-premium37 .rota-login-header37{border-radius:20px!important}}"
].join("\n");
document.head.appendChild(style);
const seen=new WeakSet();
function scan(){
 const roots=[document.querySelector("#rotaDriverAuth"),...document.querySelectorAll("[role=dialog],.modal,.auth,.login")].filter(Boolean);
 const rootList=roots.length?roots:[document.body];
 for(const root of rootList){
  const password=[...root.querySelectorAll('input[type=password]')].find(x=>!x.closest("#rotaPin33"));
  if(!password||seen.has(password))continue;
  let form=password.parentElement;
  for(let i=0;i<7&&form;i++,form=form.parentElement){
   const fields=[...form.querySelectorAll("input")];
   const btn=[...form.querySelectorAll("button,input[type=submit]")].find(b=>/giriş\s*yap|giriş|login/i.test((b.textContent||b.value||"").trim()));
   const phone=fields.find(x=>x!==password && /tel|phone|numara/i.test((x.placeholder||"")+" "+(x.type||"")));
   if(!btn||!phone)continue;
   seen.add(password);
   const panel=form;
   panel.classList.add("rota-login-form37");
   const shell=document.querySelector("#rotaDriverAuth")||panel.parentElement;
   if(shell){shell.classList.add("rota-login-premium37");shell.classList.add("rota-login-shell37")}
   btn.classList.add("rota-login-submit37");
   phone.setAttribute("autocomplete","tel");
   password.setAttribute("autocomplete","current-password");
   const wrap=document.createElement("div");wrap.className="rota-pass-wrap37";
   password.parentElement.insertBefore(wrap,password);wrap.appendChild(password);
   const toggle=document.createElement("button");toggle.type="button";toggle.className="rota-pass-toggle37";toggle.textContent="Göster";toggle.setAttribute("aria-label","Şifreyi göster");
   toggle.onclick=()=>{password.type=password.type==="password"?"text":"password";toggle.textContent=password.type==="password"?"Göster":"Gizle";toggle.setAttribute("aria-label",password.type==="password"?"Şifreyi göster":"Şifreyi gizle")};
   wrap.appendChild(toggle);
   const note=document.createElement("div");note.className="rota-login-caption37";note.textContent="ROTA Sürücü • Güvenli hesap girişi";
   panel.appendChild(note);
   const h=[...panel.querySelectorAll("h1,h2")].find(x=>/sürücü\s*girişi/i.test(x.textContent||""));
   if(h){h.textContent="ROTA Sürücü Girişi"}
   break;
  }
 }
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",scan,{once:true});else scan();
window.addEventListener("load",scan);
setTimeout(scan,600);setTimeout(scan,1900);
})();
