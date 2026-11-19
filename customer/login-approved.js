/* Approved customer login skin for FINAL50. Pure visual DOM enhancements, original event handlers intact. */
(function(){
"use strict";
if(window.__rotaCustomerThemeFinal50)return;
window.__rotaCustomerThemeFinal50=true;
function apply(){
  var overlay=document.getElementById("authOverlay");
  if(!overlay || overlay.dataset.rotaTheme==="ready")return;
  var auth=overlay.querySelector(".auth"),card=auth&&auth.querySelector(".authCard");
  var brand=auth&&auth.querySelector(".authBrand");
  var phone=document.getElementById("phone"),pass=document.getElementById("password");
  var login=document.getElementById("tabLogin"),reg=document.getElementById("tabReg");
  var action=document.getElementById("authBtn");
  if(!auth||!card||!brand||!phone||!pass||!login||!reg||!action)return;
  overlay.dataset.rotaTheme="ready";
  overlay.classList.add("rotaCustomerTheme50");
  brand.textContent="🚘 ROTA";
  var pill=document.createElement("div");pill.className="rotaCustomerPill";pill.textContent="MÜŞTERİ";
  brand.after(pill);
  var slogan=document.createElement("div");slogan.className="rotaCustomerSlogan";
  slogan.textContent="Şehrin Her Yerinde, Güvenli Yolculuk";pill.after(slogan);
  login.textContent="Giriş Yap";reg.textContent="Üye Ol";
  phone.placeholder="Telefon numaranız";phone.autocomplete="tel";
  pass.placeholder="Şifreniz";pass.autocomplete="current-password";
  if(!pass.parentElement.classList.contains("rotaCustomerPassword")){
    var wrap=document.createElement("div");wrap.className="rotaCustomerPassword";
    pass.before(wrap);wrap.appendChild(pass);
    var toggle=document.createElement("button");toggle.type="button";
    toggle.className="rotaCustomerShow";toggle.textContent="Göster";
    toggle.addEventListener("click",function(){
      var hidden=pass.type==="password";pass.type=hidden?"text":"password";
      toggle.textContent=hidden?"Gizle":"Göster";
    });
    wrap.appendChild(toggle);
  }
  var benefits=document.createElement("div");benefits.className="rotaCustomerBenefits";
  benefits.innerHTML="<span>◇ Güvenli Yolculuk</span><span>⚡ Hızlı Çağrı</span><span>⌖ Kolay Kullanım</span>";
  auth.appendChild(benefits);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",apply,{once:true});else apply();
})();
