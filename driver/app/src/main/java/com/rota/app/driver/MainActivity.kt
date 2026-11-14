package com.rota.app.driver

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.webkit.JavascriptInterface
import android.view.ViewGroup
import android.webkit.GeolocationPermissions
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat

class MainActivity : AppCompatActivity() {
    private lateinit var web: WebView
    private var geoCallback: GeolocationPermissions.Callback? = null
    private var geoOrigin: String? = null

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val root = FrameLayout(this)
        web = WebView(this)

        val webParams = FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        )
        root.addView(web, webParams)
        setContentView(root)

        ViewCompat.setOnApplyWindowInsetsListener(root) { _, insets ->
            val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            val params = web.layoutParams as FrameLayout.LayoutParams
            params.leftMargin = bars.left
            params.topMargin = bars.top
            params.rightMargin = bars.right
            params.bottomMargin = bars.bottom
            web.layoutParams = params
            insets
        }
        ViewCompat.requestApplyInsets(root)

        web.settings.javaScriptEnabled = true
        web.addJavascriptInterface(object {
            @JavascriptInterface
            fun startTracking(driverId: String, sessionToken: String) {
                if (driverId.isBlank()) return
                runOnUiThread {
                    val fine = ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
                    val coarse = ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
                    if (!fine && !coarse) return@runOnUiThread
                    val i = Intent(this@MainActivity, LocationTrackingService::class.java).apply {
                        action = LocationTrackingService.ACTION_START
                        putExtra(LocationTrackingService.EXTRA_DRIVER_ID, driverId)
                        putExtra(LocationTrackingService.EXTRA_SESSION_TOKEN, sessionToken)
                    }
                    ContextCompat.startForegroundService(this@MainActivity, i)
                }
            }

            @JavascriptInterface
            fun stopTracking() {
                runOnUiThread {
                    val i = Intent(this@MainActivity, LocationTrackingService::class.java).apply {
                        action = LocationTrackingService.ACTION_STOP
                    }
                    startService(i)
                }
            }
        }, "RotaNative")
        web.settings.domStorageEnabled = true
        web.settings.setGeolocationEnabled(true)
        web.settings.mediaPlaybackRequiresUserGesture = false
        web.settings.useWideViewPort = true
        web.settings.loadWithOverviewMode = true
        web.settings.textZoom = 100

        web.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView, url: String) {
                super.onPageFinished(view, url)

                view.evaluateJavascript(
                    """
                    (function(){
                      if(window.__rotaDriverChatInstalled)return;
                      window.__rotaDriverChatInstalled=true;

                      // E-posta ile güvenli sifre sifirlama.
                      if (!window.__rotaPasswordResetInstalled) {
                        window.__rotaPasswordResetInstalled = true;
                        (function(){
                          var role = 'driver';
                          function by(i){ return document.getElementById(i); }
                          function dig(v){ return String(v||'').replace(/\D/g,'').replace(/^90/,'').replace(/^0/,'').slice(-10); }
                          async function resetApi(action, body){
                            var coreUrl = (typeof CORE !== 'undefined' && CORE) ? CORE : 'https://ftltemgtzkjfnkxsxxmd.supabase.co/functions/v1/rota2-core';
                            var headers = {'Content-Type':'application/json'};
                            try {
                              if (typeof KEY !== 'undefined' && KEY) headers.apikey = KEY;
                              else if (typeof SUPA_KEY !== 'undefined' && SUPA_KEY) headers.apikey = SUPA_KEY;
                            } catch(e) {}
                            var r = await fetch(coreUrl + '?action=' + action, {method:'POST',headers:headers,body:JSON.stringify(body||{})});
                            var j = await r.json().catch(function(){return {};});
                            if(!r.ok) throw new Error(j.error || 'İşlem başarısız');
                            return j;
                          }
                          function installForgot(){
                            if (by('rotaForgotPassword')) return;
                            var pass = document.querySelector('input[type="password"]');
                            if (!pass) return;
                            var authBtn = by('authBtn') || pass.parentElement.querySelector('button');
                            if (!authBtn) return;
                            var f = document.createElement('button');
                            f.id = 'rotaForgotPassword';
                            f.type = 'button';
                            f.textContent = 'Şifremi Unuttum';
                            f.style.cssText = 'width:100%;margin-top:10px;border:0;background:transparent;color:#0b4aa2;font-size:14px;font-weight:800;padding:10px';
                            authBtn.insertAdjacentElement('afterend', f);
                            var eb = document.createElement('button');
                            eb.id = 'rotaEmailSetup';
                            eb.type = 'button';
                            eb.textContent = 'E-posta Tanımla';
                            eb.style.cssText = 'width:100%;margin-top:4px;border:0;background:transparent;color:#475569;font-size:13px;font-weight:800;padding:8px';
                            f.insertAdjacentElement('afterend', eb);
                            eb.onclick = async function(){
                              var phoneInput = by('phone') || document.querySelector('input[type="tel"]');
                              var phone = dig(phoneInput && phoneInput.value);
                              var currentPassword = String(pass && pass.value || '');
                              if(phone.length !== 10){ alert('Geçerli telefon numarası girin.'); return; }
                              if(currentPassword.length < 6){ alert('Önce mevcut şifrenizi şifre alanına girin.'); return; }
                              var email = prompt('Hesabınıza bağlamak istediğiniz e-posta adresini girin:');
                              if(!email) return;
                              try {
                                var s = await resetApi('email-link-start',{role:role,phone:phone,password:currentPassword,email:String(email)});
                                var ok = confirm((s.emailMasked ? s.emailMasked + ' adresine' : 'E-posta adresinize') + ' onay bağlantısı gönderildi. E-postadaki "Confirm email address" bağlantısına dokunun. Onayladıktan sonra buraya dönüp TAMAM deyin.');
                                if(!ok) return;
                                await resetApi('email-link-confirm',{role:role,phone:phone,password:currentPassword,email:String(email)});
                                alert('E-posta adresiniz doğrulandı ve hesabınıza bağlandı.');
                              } catch(e) { alert(e.message || 'E-posta tanımlanamadı.'); }
                            };
                            f.onclick = async function(){
                              var phoneInput = by('phone') || document.querySelector('input[type="tel"]');
                              var phone = dig(phoneInput && phoneInput.value);
                              if(phone.length !== 10){ alert('Geçerli telefon numarası girin.'); return; }
                              try {
                                var s = await resetApi('password-reset-start',{role:role,phone:phone});
                                var ok = confirm((s.emailMasked ? s.emailMasked + ' adresine' : 'Kayıtlı e-posta adresinize') + ' onay bağlantısı gönderildi. E-postadaki bağlantıya dokunun. Onayladıktan sonra buraya dönüp TAMAM deyin.');
                                if(!ok) return;
                                var np = prompt('Yeni şifrenizi girin (en az 6 karakter):');
                                if(!np) return;
                                await resetApi('password-reset-confirm',{role:role,phone:phone,newPassword:String(np)});
                                alert('Şifreniz değiştirildi. Yeni şifrenizle giriş yapabilirsiniz.');
                                try { localStorage.removeItem('rota_customer'); localStorage.removeItem('rota_driver'); localStorage.removeItem('rota_driver_session'); localStorage.removeItem('rota_customer_session'); } catch(e) {}
                                if(pass) pass.value = '';
                              } catch(e) { alert(e.message || 'Şifre değiştirilemedi.'); }
                            };
                          }
                          setTimeout(installForgot,300);
                          setTimeout(installForgot,1200);
                        })();
                      }


                      // Uygulamanın kendi adres/yer araması kullanılır.
                      // Ek Türkiye geneli sonuç katmanı kaldırıldı; böylece yerleşik arama listesi kapanmaz.


                      function state(){
                        var keys=['rota_driver','driver','rotaDriver'];
                        for(var i=0;i<keys.length;i++){try{var v=JSON.parse(localStorage.getItem(keys[i])||'null');if(v)return v;}catch(e){}}
                        return {};
                      }
                      function did(){
                        var s=state();
                        return localStorage.getItem('rota_driver_id')||localStorage.getItem('driver_id')||s.driverId||s.driver_id||s.id||'';
                      }
                      function stok(){
                        var s=state();
                        return localStorage.getItem('rota_driver_session')||localStorage.getItem('driver_session')||s.sessionToken||s.session_token||s.token||'';
                      }
                      function headers(){
                        var h={'Content-Type':'application/json'};
                        try{if(typeof KEY!=='undefined'&&KEY)h.apikey=KEY;else if(typeof SUPA_KEY!=='undefined'&&SUPA_KEY)h.apikey=SUPA_KEY;}catch(e){}
                        return h;
                      }
                      var activeTrip='';

                      var btn=document.createElement('button');
                      btn.textContent='💬 Mesaj';
                      btn.style.cssText='display:none;position:fixed;right:16px;bottom:22px;z-index:1000001;border:0;border-radius:22px;background:#081329;color:white;font-weight:800;padding:12px 16px;box-shadow:0 6px 18px rgba(0,0,0,.28)';
                      document.body.appendChild(btn);

                      var panel=document.createElement('div');
                      panel.style.cssText='display:none;position:fixed;left:10px;right:10px;bottom:10px;top:18%;z-index:1000002;background:#fff;border-radius:18px;box-shadow:0 10px 35px rgba(0,0,0,.35);font-family:Arial,sans-serif;overflow:hidden';
                      panel.innerHTML='<div style="height:54px;background:#081329;color:white;display:flex;align-items:center;justify-content:space-between;padding:0 14px;font-weight:800"><span>Müşteri ile Mesajlaş</span><button id="rdChatClose" style="border:0;background:transparent;color:white;font-size:24px">×</button></div><div id="rdChatMessages" style="height:calc(100% - 116px);overflow:auto;padding:12px;background:#f4f6f8"></div><div style="height:62px;display:flex;gap:8px;padding:9px;border-top:1px solid #ddd;background:white"><input id="rdChatInput" maxlength="500" placeholder="Mesaj yazın..." style="flex:1;border:1px solid #ccd2d8;border-radius:12px;padding:0 12px;font-size:16px"><button id="rdChatSend" style="border:0;border-radius:12px;background:#f6be35;color:#081329;font-weight:900;padding:0 15px">Gönder</button></div>';
                      document.body.appendChild(panel);

                      function esc(v){return String(v||'').replace(/[&<>"']/g,function(ch){return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[ch]});}
                      function render(list){
                        var el=document.getElementById('rdChatMessages'); if(!el)return;
                        el.innerHTML=(list||[]).map(function(m){
                          var mine=m.sender_role==='driver';
                          return '<div style="display:flex;justify-content:'+(mine?'flex-end':'flex-start')+';margin:6px 0"><div style="max-width:78%;padding:9px 11px;border-radius:14px;background:'+(mine?'#081329':'#fff')+';color:'+(mine?'#fff':'#111')+';box-shadow:0 1px 4px rgba(0,0,0,.12);font-size:14px">'+esc(m.body)+'</div></div>';
                        }).join('');
                        el.scrollTop=el.scrollHeight;
                      }
                      async function findTrip(){
                        var driverId=did(),token=stok();
                        if(!driverId||!token||typeof CORE==='undefined'||!CORE){btn.style.display='none';return;}
                        try{
                          var r=await fetch(CORE+'?action=driver-trips',{method:'POST',headers:headers(),body:JSON.stringify({driverId:driverId,sessionToken:token})});
                          var j=await r.json();
                          if(!r.ok)return;
                          var t=(j.trips||[]).find(function(x){return x.status==='accepted'&&x.driver_id===driverId;});
                          activeTrip=t&&t.trip_id||'';
                          btn.style.display=activeTrip?'block':'none';
                          if(!activeTrip)panel.style.display='none';
                        }catch(e){}
                      }
                      async function load(){
                        if(!activeTrip)return;
                        var driverId=did(),token=stok();
                        try{
                          var r=await fetch(CORE+'?action=trip-chat-list',{method:'POST',headers:headers(),body:JSON.stringify({role:'driver',tripId:activeTrip,driverId:driverId,sessionToken:token})});
                          var j=await r.json(); if(r.ok)render(j.messages||[]);
                        }catch(e){}
                      }
                      async function send(){
                        var input=document.getElementById('rdChatInput'),msg=(input&&input.value||'').trim();
                        if(!msg||!activeTrip)return;
                        var driverId=did(),token=stok();
                        try{
                          var r=await fetch(CORE+'?action=trip-chat-send',{method:'POST',headers:headers(),body:JSON.stringify({role:'driver',tripId:activeTrip,driverId:driverId,sessionToken:token,message:msg})});
                          if(r.ok){input.value='';await load();}
                        }catch(e){}
                      }
                      btn.onclick=function(){panel.style.display='block';load();};
                      document.getElementById('rdChatClose').onclick=function(){panel.style.display='none';};
                      document.getElementById('rdChatSend').onclick=send;
                      document.getElementById('rdChatInput').addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();send();}});
                      // Android ön plan konum takibi: Google Maps açıldığında WebView arka plana düşse bile sürücü konumu akar.
                      function nativeStartTracking(){
                        try{
                          var driverId=did(),token=stok();
                          if(driverId && window.RotaNative && typeof window.RotaNative.startTracking==='function'){
                            window.RotaNative.startTracking(String(driverId), String(token||''));
                          }
                        }catch(e){}
                      }
                      function nativeStopTracking(){
                        try{
                          if(window.RotaNative && typeof window.RotaNative.stopTracking==='function') window.RotaNative.stopTracking();
                        }catch(e){}
                      }
                      var nativeWrapTimer=setInterval(function(){
                        try{
                          if(typeof window.acceptTrip==='function' && !window.acceptTrip.__rotaNativeWrapped){
                            var originalAccept=window.acceptTrip;
                            var wrapped=async function(){
                              nativeStartTracking();
                              try{return await originalAccept.apply(this,arguments);}
                              catch(e){throw e;}
                            };
                            wrapped.__rotaNativeWrapped=true;
                            window.acceptTrip=wrapped;
                          }
                          if(activeTrip) nativeStartTracking();
                        }catch(e){}
                      },1000);

                      setInterval(findTrip,3000); setTimeout(findTrip,1000);
                      setInterval(function(){if(panel.style.display==='block')load();},2500);
                    })();
                    """.trimIndent(),
                    null
                )

            }

            override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
                val target = url ?: return false
                return try {
                    when {
                        target.startsWith("intent://") -> {
                            val intent = Intent.parseUri(target, Intent.URI_INTENT_SCHEME)
                            val fallback = intent.getStringExtra("browser_fallback_url")
                            try {
                                startActivity(intent)
                            } catch (_: Exception) {
                                if (!fallback.isNullOrBlank()) {
                                    startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(fallback)))
                                }
                            }
                            true
                        }
                        target.startsWith("geo:") ||
                        target.startsWith("google.navigation:") ||
                        target.startsWith("https://www.google.com/maps") ||
                        target.startsWith("https://maps.google.com") -> {
                            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(target)))
                            true
                        }
                        else -> false
                    }
                } catch (_: Exception) {
                    false
                }
            }
        }
        web.webChromeClient = object : WebChromeClient() {
            override fun onGeolocationPermissionsShowPrompt(origin: String, callback: GeolocationPermissions.Callback) {
                if (ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
                    callback.invoke(origin, true, false)
                } else {
                    geoOrigin = origin
                    geoCallback = callback
                    ActivityCompat.requestPermissions(
                        this@MainActivity,
                        arrayOf(Manifest.permission.ACCESS_COARSE_LOCATION, Manifest.permission.ACCESS_FINE_LOCATION),
                        200
                    )
                }
            }
        }

        if (Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) {
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.POST_NOTIFICATIONS), 201)
        }

        web.loadUrl("https://rota-surucu-final15.onrender.com")
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == 200) {
            val granted = grantResults.any { it == PackageManager.PERMISSION_GRANTED }
            geoCallback?.invoke(geoOrigin, granted, false)
            geoCallback = null
            geoOrigin = null
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (::web.isInitialized && web.canGoBack()) web.goBack() else super.onBackPressed()
    }
}
