import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const SUPA_URL=Deno.env.get("SUPABASE_URL")||"";
const SECRET=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}").default||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const SOURCE="https://ftltemgtzkjfnkxsxxmd.supabase.co/functions/v1/rota-customer-v3";

function inject(html:string){
  const css=`
<style>
@supports (-webkit-touch-callout:none){
  .sheet{padding-bottom:calc(18px + env(safe-area-inset-bottom))!important}
  #call{pointer-events:auto!important;touch-action:manipulation!important;opacity:1!important;min-height:46px!important}
  .auth{overflow-y:auto!important;-webkit-overflow-scrolling:touch!important;align-items:flex-start!important;justify-content:flex-start!important;padding-top:max(20px,env(safe-area-inset-top))!important;padding-bottom:calc(120px + env(safe-area-inset-bottom))!important;max-height:100dvh!important;touch-action:pan-y!important}
  .authCard{flex:0 0 auto!important;margin:0 auto!important;max-height:none!important;overflow:visible!important}
  .resetBox.show{overflow:visible!important}
}
</style>`;

  const js=`
<script>
(function(){
  const isiOS=/iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);
  if(!isiOS)return;

  function msg(t){ try{document.getElementById('routeText').textContent=t}catch(e){} }
  function emailValid(v){return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(String(v||'').trim())}
  function session(){try{return JSON.parse(localStorage.getItem('rota_customer_v3')||'null')}catch(e){return null}}

  async function resolveTyped(kind){
    const input=document.getElementById(kind==='pickup'?'pickupInput':'destInput');
    if(!input)return false;
    const q=String(input.value||'').trim();
    if(q.length<2)return false;
    try{
      const j=await getJson(GEO+'?action=search&q='+encodeURIComponent(q));
      const x=(j.results||[])[0];
      if(!x)return false;
      const point={lat:+x.lat,lng:+x.lng,label:x.label||q};
      if(kind==='pickup'){
        pickup=point; input.value=point.label; setPickupMarker(); refreshNearby();
      }else{
        target=point; input.value=point.label; setDestMarker();
      }
      await calcRoute();
      return true;
    }catch(e){ msg(e && e.message ? e.message : 'Adres bulunamadı'); return false; }
  }

  let gpsBusy=false,lastGpsAttempt=0;
  async function preciseGps(){
    if(gpsBusy)return;
    if(!navigator.geolocation){msg('Konum hizmeti kullanılamıyor. Alış adresini elle seçin.');return}
    gpsBusy=true; lastGpsAttempt=Date.now();
    msg('Konumunuz otomatik belirleniyor...');
    const pInput=document.getElementById('pickupInput');
    if(pInput && !pickup)pInput.placeholder='Konumunuz bulunuyor...';
    let best=null,watch=null,done=false;
    const finish=async()=>{
      if(done)return; done=true; gpsBusy=false;
      if(watch!==null)navigator.geolocation.clearWatch(watch);
      if(pInput)pInput.placeholder='Alış adresini yazın';
      if(!best){msg('Konum alınamadı. iPhone konum iznini açın veya alış adresini elle seçin.');return}
      pickup={lat:best.coords.latitude,lng:best.coords.longitude,label:'Mevcut konumum'};
      document.getElementById('pickupInput').value='Mevcut konumum'; setPickupMarker();
      try{map.setView([pickup.lat,pickup.lng],16)}catch(e){}
      try{
        const j=await post(GEO+'?action=reverse',{lat:pickup.lat,lng:pickup.lng});
        if(j&&j.label){pickup.label=j.label;document.getElementById('pickupInput').value=j.label}
      }catch(e){}
      refreshNearby(); calcRoute();
      const acc=Math.round(best.coords.accuracy||0);
      if(acc>100)msg('Konum yaklaşık '+acc+' m hassasiyetle alındı. Gerekirse alış adresini elle seçin.');
    };
    watch=navigator.geolocation.watchPosition(
      p=>{if(!best||(p.coords.accuracy||99999)<(best.coords.accuracy||99999))best=p;if((p.coords.accuracy||99999)<=40)finish()},
      e=>{
        gpsBusy=false;
        if(pInput)pInput.placeholder='Alış adresini yazın';
        if(e&&e.code===1)msg('iPhone konum izni kapalı. Konum iznini açın veya Safari’de tekrar deneyin.');
        else msg('Konum alınamadı. Tekrar deneniyor veya alış adresini elle seçebilirsiniz.');
      },
      {enableHighAccuracy:true,maximumAge:0,timeout:15000}
    );
    setTimeout(finish,6000);
  }

  function installEmailUI(){
    const forgot=document.getElementById('forgotBtn');
    const resetBox=document.getElementById('resetBox');
    if(forgot && resetBox && !document.getElementById('resetEmail')){
      resetBox.innerHTML=
        '<div style="font-weight:800;color:#081329">Şifre Sıfırlama</div>'+
        '<div style="font-size:12px;color:#64748b;margin-top:5px">E-posta daha önce tanımlandıysa aşağıdan bağlantı isteyin.</div>'+
        '<input id="resetEmail" type="email" autocomplete="email" placeholder="E-posta adresi">'+
        '<button id="resetStartEmail" class="miniBtn" style="margin-top:8px">Şifre Yenileme Bağlantısı Gönder</button>'+
        '<div id="resetStep2Email" style="display:none;margin-top:10px">'+
          '<input id="newPasswordEmail" type="password" minlength="6" placeholder="Yeni şifre (en az 6 karakter)">'+
          '<button id="resetConfirmEmail" class="miniBtn" style="margin-top:8px">Bağlantıyı Onayladım, Şifreyi Değiştir</button>'+
        '</div>'+
        '<div class="sep" style="margin:14px 0"></div>'+
        '<div style="font-weight:800;color:#081329">Eski Hesabımı Kurtar</div>'+
        '<div style="font-size:12px;color:#64748b;margin-top:5px">Daha önce sadece telefonla kayıt olduysanız e-postanızı burada tanımlayın.</div>'+
        '<input id="legacyPhone" inputmode="tel" placeholder="Kayıtlı telefon numarası">'+
        '<input id="legacyFirstName" placeholder="Ad">'+
        '<input id="legacyLastName" placeholder="Soyad">'+
        '<input id="legacyTc" inputmode="numeric" maxlength="11" placeholder="T.C. Kimlik No">'+
        '<input id="legacyEmail" type="email" autocomplete="email" placeholder="E-posta adresi (isteğe bağlı)">'+
        '<input id="legacyNewPassword" type="password" minlength="6" placeholder="Yeni şifre (en az 6 karakter)">'+
        '<button id="legacyStart" class="miniBtn" style="margin-top:8px">Yeni Şifreyi Kaydet</button>'+
        '<div id="resetInfoEmail" class="resetInfo"></div>';

      forgot.onclick=()=>{
        resetBox.classList.toggle('show');
        document.getElementById('resetInfoEmail').textContent='';
      };

      document.getElementById('resetStartEmail').onclick=async()=>{
        const email=String(document.getElementById('resetEmail').value||'').trim().toLowerCase();
        const info=document.getElementById('resetInfoEmail');
        if(!emailValid(email)){info.textContent='Geçerli e-posta adresi girin.';return}
        info.textContent='Gönderiliyor...';
        try{
          await post(CORE+'?action=password-reset-email-start',{role:'customer',email});
          info.textContent='E-posta adresi kayıtlıysa şifre yenileme bağlantısı gönderildi. Gelen kutusu ve spam klasörünü kontrol edin.';
          document.getElementById('resetStep2Email').style.display='block';
        }catch(e){info.textContent=e.message}
      };

      async function checkResetStatus(){
        const email=String(document.getElementById('resetEmail')?.value||'').trim().toLowerCase();
        const info=document.getElementById('resetInfoEmail');
        if(!emailValid(email)) return;
        try{
          const s=await post(CORE+'?action=password-reset-email-status',{role:'customer',email});
          if(s&&s.confirmed){
            document.getElementById('resetStep2Email').style.display='block';
            info.textContent='E-posta bağlantısı onaylandı. Şimdi yeni şifrenizi yazıp değiştirin.';
          }
        }catch(e){}
      }

      document.getElementById('resetConfirmEmail').onclick=async()=>{
        const email=String(document.getElementById('resetEmail').value||'').trim().toLowerCase();
        const np=String(document.getElementById('newPasswordEmail').value||'');
        const info=document.getElementById('resetInfoEmail');
        if(!emailValid(email)){info.textContent='Geçerli e-posta adresi girin.';return}
        if(np.length<6){info.textContent='Yeni şifre en az 6 karakter olmalı.';return}
        info.textContent='Onay kontrol ediliyor...';
        try{
          await post(CORE+'?action=password-reset-email-confirm',{role:'customer',email,newPassword:np});
          info.textContent='Şifreniz değiştirildi. Yeni şifrenizle giriş yapabilirsiniz.';
          const pw=document.getElementById('password'); if(pw)pw.value=np;
        }catch(e){info.textContent=e.message}
      };

      document.getElementById('legacyStart').onclick=async()=>{
        const info=document.getElementById('resetInfoEmail');
        const phone=String(document.getElementById('legacyPhone').value||'').trim();
        const firstName=String(document.getElementById('legacyFirstName').value||'').trim();
        const lastName=String(document.getElementById('legacyLastName').value||'').trim();
        const tcNo=String(document.getElementById('legacyTc').value||'').trim();
        const newPassword=String(document.getElementById('legacyNewPassword').value||'');
        if(newPassword.length<6){info.textContent='Yeni şifre en az 6 karakter olmalı.';return}
        info.textContent='Hesap bilgileri kontrol ediliyor...';
        try{
          await post(CORE+'?action=legacy-customer-password-direct',{phone,firstName,lastName,tcNo,newPassword});
          info.textContent='Şifreniz kaydedildi. Artık telefon numaranız ve bu şifreyle giriş yapabilirsiniz.';
          const phoneInput=document.getElementById('phone'); if(phoneInput)phoneInput.value=phone;
          const pw=document.getElementById('password'); if(pw)pw.value=newPassword;
        }catch(e){info.textContent=e.message}
      };
    }

    const drawer=document.getElementById('drawer');
    if(drawer && !document.getElementById('iosEmailPanel')){
      const sep=document.createElement('div'); sep.className='sep';
      const wrap=document.createElement('div'); wrap.id='iosEmailPanel'; wrap.className='sub show';
      wrap.style.margin='10px 0';
      wrap.innerHTML=
        '<b>E-posta</b>'+
        '<div style="font-size:12px;color:#64748b;margin-top:4px">Şifre yenileme bağlantıları bu adrese gönderilir.</div>'+
        '<input id="iosAccountEmail" class="featureInput" type="email" autocomplete="email" placeholder="E-posta adresiniz">'+
        '<div class="featureRow">'+
          '<button id="iosEmailSend" class="miniBtn">E-posta Tanımla / Bağlantı Gönder</button>'+
          '<button id="iosEmailConfirm" class="miniBtn">Bağlantıyı Onayladım</button>'+
        '</div>'+
        '<div id="iosEmailInfo" style="font-size:12px;margin-top:6px"></div>';
      const logout=document.getElementById('logoutBtn');
      drawer.insertBefore(sep,logout||null); drawer.insertBefore(wrap,logout||null);

      async function loadEmail(){
        const s=session(); if(!s)return;
        try{
          const j=await post(CORE+'?action=customer-profile',{accountId:s.accountId,sessionToken:s.sessionToken});
          const p=j.profile||{};
          document.getElementById('iosAccountEmail').value=p.email||'';
          document.getElementById('iosEmailInfo').textContent=p.emailVerified?'E-posta doğrulandı.':'E-posta henüz doğrulanmadı.';
        }catch(e){}
      }
      document.getElementById('iosEmailSend').onclick=async()=>{
        const s=session(),email=String(document.getElementById('iosAccountEmail').value||'').trim().toLowerCase();
        const info=document.getElementById('iosEmailInfo');
        if(!s){info.textContent='Önce giriş yapın.';return}
        if(!emailValid(email)){info.textContent='Geçerli e-posta adresi girin.';return}
        info.textContent='Gönderiliyor...';
        try{
          const j=await post(CORE+'?action=customer-email-start',{accountId:s.accountId,sessionToken:s.sessionToken,email});
          info.textContent=j.alreadyVerified?'E-posta zaten doğrulanmış.':'Doğrulama bağlantısı e-postanıza gönderildi.';
        }catch(e){info.textContent=e.message}
      };
      document.getElementById('iosEmailConfirm').onclick=async()=>{
        const s=session(),email=String(document.getElementById('iosAccountEmail').value||'').trim().toLowerCase();
        const info=document.getElementById('iosEmailInfo');
        if(!s){info.textContent='Önce giriş yapın.';return}
        info.textContent='Onay kontrol ediliyor...';
        try{
          await post(CORE+'?action=customer-email-confirm',{accountId:s.accountId,sessionToken:s.sessionToken,email});
          info.textContent='E-posta doğrulandı. Şifre yenilemede kullanılabilir.';
        }catch(e){info.textContent=e.message}
      };
      setTimeout(loadEmail,400);
    }

    const registerExtra=document.getElementById('registerExtra');
    if(registerExtra && !document.getElementById('iosRegisterEmail')){
      const e=document.createElement('input'); e.id='iosRegisterEmail'; e.type='email'; e.autocomplete='email'; e.placeholder='E-posta (şifre yenileme için)';
      registerExtra.appendChild(e);
      const authBtn=document.getElementById('authBtn');
      if(authBtn && typeof authBtn.onclick==='function'){
        const old=authBtn.onclick;
        authBtn.onclick=async function(ev){
          const isReg=(typeof mode!=='undefined' && mode==='register');
          const email=String(e.value||'').trim().toLowerCase();
          if(isReg && !emailValid(email)){
            const m=document.getElementById('authMsg'); if(m)m.textContent='Kayıt için geçerli e-posta adresi girin.';
            return;
          }
          await old.call(this,ev);
          if(isReg){
            const s=session();
            if(s){
              try{
                await post(CORE+'?action=customer-email-start',{accountId:s.accountId,sessionToken:s.sessionToken,email});
                alert('Kayıt tamamlandı. E-posta doğrulama bağlantısı '+email+' adresine gönderildi.');
              }catch(err){
                alert('Kayıt tamamlandı ancak e-posta bağlantısı gönderilemedi: '+err.message);
              }
            }
          }
        };
      }
    }
  }

  try{
    const pu=document.getElementById('pickupInput');
    const de=document.getElementById('destInput');
    if(pu)pu.addEventListener('input',()=>{pickup=null;routeKm=0});
    if(de)de.addEventListener('input',()=>{target=null;routeKm=0});
    if(pu)pu.addEventListener('keydown',async e=>{if(e.key==='Enter'){e.preventDefault();await resolveTyped('pickup')}});
    if(de)de.addEventListener('keydown',async e=>{if(e.key==='Enter'){e.preventDefault();await resolveTyped('dest')}});
    const gps=document.getElementById('useGps'); if(gps)gps.onclick=preciseGps;

    const call=document.getElementById('call');
    if(call){
      const original=call.onclick;
      call.onclick=async function(ev){
        call.disabled=false;
        const puText=String(document.getElementById('pickupInput')?.value||'').trim();
        const deText=String(document.getElementById('destInput')?.value||'').trim();
        if(!pickup&&puText.length>=2)await resolveTyped('pickup');
        if(!target&&deText.length>=2)await resolveTyped('dest');
        if(pickup&&target&&!routeKm)await calcRoute();
        if(!pickup||!target||!routeKm){msg('Alış ve varış adresini seçin. Adresi yazıp listeden seçebilir veya Araç Çağır’a tekrar basabilirsiniz.');return}
        if(typeof original==='function')return original.call(this,ev);
      };
    }
    installEmailUI();

    function autoLocate(){
      try{
        if(!session() || pickup || gpsBusy || document.hidden)return;
        if(Date.now()-lastGpsAttempt<8000)return;
        preciseGps();
      }catch(e){}
    }

    // Oturum zaten açıksa sayfa açılır açılmaz konumu otomatik bul.
    setTimeout(autoLocate,700);

    // Kullanıcı giriş yaptıktan sonra auth ekranı kapanınca konumu otomatik bul.
    const auth=document.getElementById('auth');
    if(auth){
      const obs=new MutationObserver(()=>{ if(auth.classList.contains('hide')) setTimeout(autoLocate,250); });
      obs.observe(auth,{attributes:true,attributeFilter:['class']});
    }

    // iPhone Safari/WhatsApp iç tarayıcısından geri dönüldüğünde konum yoksa tekrar dene.
    document.addEventListener('visibilitychange',()=>{ if(!document.hidden){setTimeout(autoLocate,250);setTimeout(()=>{try{checkResetStatus()}catch(e){}},300)} });
    window.addEventListener('focus',()=>{setTimeout(autoLocate,250);setTimeout(()=>{try{checkResetStatus()}catch(e){}},300)});
    window.addEventListener('pageshow',()=>setTimeout(()=>{try{checkResetStatus()}catch(e){}},350));
  }catch(e){}
})();
</script>`;

  html=html.replace("</head>",css+"</head>");
  html=html.replace("</body>",js+"</body>");
  return html;
}


async function sha256(s:string){
  const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));
  return Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,"0")).join("");
}

async function publish(html:string){
  const pub=await fetch("https://ship.page/deploy",{
    method:"POST",
    headers:{"Content-Type":"text/html; charset=utf-8"},
    body:html
  });
  const txt=await pub.text();
  if(!pub.ok) throw new Error("Yayın başarısız: "+pub.status);
  const j=JSON.parse(txt);
  return {base_url:j.url,expires_at:j.expires_at};
}

Deno.serve(async()=>{
  try{
    const r=await fetch(SOURCE,{cache:"no-store"});
    if(!r.ok) throw new Error("Kaynak alınamadı: "+r.status);
    const html=inject(await r.text());
    const hash=await sha256(html);

    const admin=createClient(SUPA_URL,SECRET,{auth:{persistSession:false}});
    let {data:host}=await admin.from("rota2_iphone_web_hosts")
      .select("base_url,expires_at,source_hash,updated_at")
      .eq("kind","customer").maybeSingle();

    const needsPublish=
      !host ||
      host.source_hash!==hash ||
      !host.expires_at ||
      new Date(host.expires_at).getTime()<Date.now()+6*60*60*1000;

    if(needsPublish){
      const fresh=await publish(html);
      const row={
        kind:"customer",
        base_url:fresh.base_url,
        expires_at:fresh.expires_at,
        source_hash:hash,
        updated_at:new Date().toISOString()
      };
      const {error:up}=await admin.from("rota2_iphone_web_hosts").upsert(row,{onConflict:"kind"});
      if(up) throw new Error(up.message);
      host=row;
    }

    return Response.redirect(host.base_url,302);
  }catch(e){
    return Response.json({error:e instanceof Error?e.message:String(e)},{status:500});
  }
});