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
  // Keep the original registration API and submit handler. Guarantee visible fields on tab clicks.
  function ensureRegisterFields(){
    var fields=document.getElementById("rotaRegExtra");
    if(!fields){
      fields=document.createElement("div");
      fields.id="rotaRegExtra";
      fields.className="rotaRegExtra";
      fields.innerHTML='<input id="rotaFirstName" class="inp" autocomplete="given-name" placeholder="Ad" required>'+
        '<input id="rotaLastName" class="inp" autocomplete="family-name" placeholder="Soyad" required>'+
        '<input id="rotaTcNo" class="inp" inputmode="numeric" maxlength="11" autocomplete="off" placeholder="T.C. kimlik numarası" required>';
      action.before(fields);
    }
    if(!document.getElementById("rotaEmail")){
      var email=document.createElement("input");
      email.id="rotaEmail";
      email.type="email";
      email.className="inp";
      email.autocomplete="email";
      email.required=true;
      email.placeholder="E-posta adresiniz (zorunlu)";
      fields.appendChild(email);
    }
    return fields;
  }
  function syncRegistration(isRegister){
    login.classList.toggle("on",!isRegister);
    login.classList.toggle("off",isRegister);
    reg.classList.toggle("on",isRegister);
    reg.classList.toggle("off",!isRegister);
    action.textContent=isRegister?"Kayıt Ol":"Giriş Yap";
    var fields=ensureRegisterFields();
    fields.classList.toggle("show",isRegister);
    fields.style.setProperty("display",isRegister?"block":"none","important");
    fields.setAttribute("aria-hidden",isRegister?"false":"true");
  }
  // Do not stop propagation: original handlers still set the internal login/register mode.
  // Run after those handlers too, because older scripts may reset the field visibility.
  reg.addEventListener("click",function(){
    syncRegistration(true);
    setTimeout(function(){syncRegistration(true)},0);
  });
  login.addEventListener("click",function(){
    syncRegistration(false);
    setTimeout(function(){syncRegistration(false)},0);
  });
  syncRegistration(reg.classList.contains("on"));

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
