/* ROTA Driver v39: narrow-screen login polishing, no auth logic changes */
(function(){
"use strict";
if(window.__rotaLoginPolish39)return; window.__rotaLoginPolish39=true;
const style=document.createElement("style");style.id="rotaLoginPolish39";
style.textContent=[
"#rotaDriverAuth.rota-login38::before{content:none!important;display:none!important}",
"#rotaDriverAuth.rota-login38{overflow-x:hidden!important;max-width:100vw!important;min-height:100dvh!important;padding:clamp(16px,3vh,32px) 14px calc(25px + env(safe-area-inset-bottom))!important;gap:0!important}",
"#rotaDriverAuth.rota-login38 .rota-login-card38{width:min(100%,440px)!important;max-width:440px!important;margin:12px auto!important;padding:24px 19px!important;position:relative!important;overflow:hidden!important}",
"#rotaDriverAuth.rota-login38 .rota-pass-wrap38{display:block!important;position:relative!important;width:100%!important;min-height:54px!important}",
"#rotaDriverAuth.rota-login38 .rota-pass-wrap38 input{width:100%!important;padding-right:94px!important;min-height:54px!important;box-sizing:border-box!important}",
"#rotaDriverAuth.rota-login38 .rota-pass-wrap38 .rota-pass-toggle38{position:absolute!important;z-index:5!important;right:8px!important;top:50%!important;transform:translateY(-50%)!important;min-height:36px!important;height:36px!important;line-height:36px!important;padding:0 10px!important;margin:0!important;width:auto!important;white-space:nowrap!important}",
"#rotaDriverAuth.rota-login38 .rota-login-brand38{max-width:100%;font-size:clamp(10px,3vw,13px)!important;letter-spacing:1.5px!important}",
"@media(max-width:420px){#rotaDriverAuth.rota-login38 .rota-login-card38{padding:22px 16px!important;border-radius:20px!important}#rotaDriverAuth.rota-login38 .rota-login-card38 h1,#rotaDriverAuth.rota-login38 .rota-login-card38 h2{font-size:26px!important}}"
].join("\n");
document.head.appendChild(style);
})();