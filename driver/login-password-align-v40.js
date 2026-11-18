/* ROTA Driver: password visibility button aligned inside its own input row */
(function(){
"use strict";
if(window.__rotaPasswordAlign40)return;
window.__rotaPasswordAlign40=true;
const css=document.createElement("style");css.id="rotaPasswordAlign40CSS";
css.textContent=[
"#rotaDriverAuth.rota-login38 .rota-login-card38 .rota-pass-wrap38{display:grid!important;grid-template-columns:minmax(0,1fr)!important;grid-template-rows:56px!important;align-items:stretch!important;width:100%!important;height:56px!important;min-height:56px!important;margin:0 0 13px!important;position:relative!important;box-sizing:border-box!important;overflow:visible!important}",
"#rotaDriverAuth.rota-login38 .rota-login-card38 .rota-pass-wrap38>input{grid-column:1!important;grid-row:1!important;position:static!important;width:100%!important;min-height:56px!important;height:56px!important;margin:0!important;padding:12px 92px 12px 15px!important;box-sizing:border-box!important;align-self:stretch!important}",
"#rotaDriverAuth.rota-login38 .rota-login-card38 .rota-pass-wrap38>.rota-pass-toggle38{grid-column:1!important;grid-row:1!important;position:relative!important;inset:auto!important;top:auto!important;right:auto!important;bottom:auto!important;left:auto!important;transform:none!important;align-self:center!important;justify-self:end!important;margin:0 8px 0 0!important;padding:0 11px!important;min-height:35px!important;height:35px!important;width:auto!important;max-width:75px!important;border:0!important;border-radius:9px!important;font:700 12px system-ui,Arial!important;line-height:35px!important;z-index:3!important;white-space:nowrap!important;box-sizing:border-box!important}",
"#rotaDriverAuth.rota-login38 .rota-login-card38 input:not([type=hidden]):not([type=checkbox]){max-width:100%!important}",
"@media(max-width:420px){#rotaDriverAuth.rota-login38 .rota-login-card38 .rota-pass-wrap38{grid-template-rows:54px!important;height:54px!important;min-height:54px!important}#rotaDriverAuth.rota-login38 .rota-login-card38 .rota-pass-wrap38>input{height:54px!important;min-height:54px!important}}"
].join("\n");
document.head.appendChild(css);
})();