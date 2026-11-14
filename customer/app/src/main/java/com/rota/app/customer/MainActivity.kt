package com.rota.app.customer

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.os.Bundle
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

        root.addView(
            web,
            FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        )
        setContentView(root)

        // WebView'in kendisini durum ve gezinme cubuklarinin arasina sigdir.
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
        web.settings.domStorageEnabled = true
        web.settings.setGeolocationEnabled(true)
        web.settings.mediaPlaybackRequiresUserGesture = false
        web.settings.useWideViewPort = true
        web.settings.loadWithOverviewMode = true
        web.settings.textZoom = 90

        // Tum arayuzu yaklasik %15 kucult.
        web.setInitialScale(85)

        web.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView, url: String) {
                super.onPageFinished(view, url)

                // Responsive sayfalarda WebView'in olcek ayarini garanti altina al.
                view.evaluateJavascript(
                    """
                    (function() {
                      var meta = document.querySelector('meta[name="viewport"]');
                      if (!meta) {
                        meta = document.createElement('meta');
                        meta.name = 'viewport';
                        document.head.appendChild(meta);
                      }
                      meta.setAttribute(
                        'content',
                        'width=device-width, initial-scale=0.85, minimum-scale=0.85, maximum-scale=0.85, user-scalable=no, viewport-fit=contain'
                      );

                      if (window.__rotaLiveTrackingInstalled) return;
                      window.__rotaLiveTrackingInstalled = true;

                      // E-posta ile güvenli sifre sifirlama.
                      if (!window.__rotaPasswordResetInstalled) {
                        window.__rotaPasswordResetInstalled = true;
                        (function(){
                          var role = 'customer';
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

                      var box = document.createElement('div');
                      box.id = 'rotaLiveDriverBox';
                      box.style.cssText = 'display:none;position:fixed;left:14px;right:14px;top:18px;z-index:999999;background:#081329;color:white;border-radius:16px;padding:12px 14px;box-shadow:0 8px 24px rgba(0,0,0,.24);font-family:Arial,sans-serif';
                      box.innerHTML = '<div style="font-size:12px;opacity:.8">Sürücü size geliyor</div><div id="rotaLiveEta" style="font-size:24px;font-weight:900;margin-top:2px">-- dk</div><div id="rotaLiveDistance" style="font-size:12px;opacity:.85;margin-top:2px"></div>';
                      document.body.appendChild(box);


                      var chatBtn = document.createElement('button');
                      chatBtn.id = 'rotaChatButton';
                      chatBtn.textContent = '💬 Mesaj';
                      chatBtn.style.cssText = 'display:none;position:fixed;right:16px;bottom:22px;z-index:1000001;border:0;border-radius:22px;background:#081329;color:white;font-weight:800;padding:12px 16px;box-shadow:0 6px 18px rgba(0,0,0,.28)';
                      document.body.appendChild(chatBtn);

                      var chatPanel = document.createElement('div');
                      chatPanel.id = 'rotaChatPanel';
                      chatPanel.style.cssText = 'display:none;position:fixed;left:10px;right:10px;bottom:10px;top:18%;z-index:1000002;background:#fff;border-radius:18px;box-shadow:0 10px 35px rgba(0,0,0,.35);font-family:Arial,sans-serif;overflow:hidden';
                      chatPanel.innerHTML = '<div style="height:54px;background:#081329;color:white;display:flex;align-items:center;justify-content:space-between;padding:0 14px;font-weight:800"><span>Sürücü ile Mesajlaş</span><button id="rotaChatClose" style="border:0;background:transparent;color:white;font-size:24px">×</button></div><div id="rotaChatMessages" style="height:calc(100% - 116px);overflow:auto;padding:12px;background:#f4f6f8"></div><div style="height:62px;display:flex;gap:8px;padding:9px;border-top:1px solid #ddd;background:white"><input id="rotaChatInput" maxlength="500" placeholder="Mesaj yazın..." style="flex:1;border:1px solid #ccd2d8;border-radius:12px;padding:0 12px;font-size:16px"><button id="rotaChatSend" style="border:0;border-radius:12px;background:#f6be35;color:#081329;font-weight:900;padding:0 15px">Gönder</button></div>';
                      document.body.appendChild(chatPanel);

                      function esc(v){return String(v||'').replace(/[&<>"']/g,function(ch){return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[ch]});}
                      function renderChat(list){
                        var el=document.getElementById('rotaChatMessages');
                        if(!el)return;
                        el.innerHTML=(list||[]).map(function(m){
                          var mine=m.sender_role==='customer';
                          return '<div style="display:flex;justify-content:'+(mine?'flex-end':'flex-start')+';margin:6px 0"><div style="max-width:78%;padding:9px 11px;border-radius:14px;background:'+(mine?'#081329':'#fff')+';color:'+(mine?'#fff':'#111')+';box-shadow:0 1px 4px rgba(0,0,0,.12);font-size:14px">'+esc(m.body)+'</div></div>';
                        }).join('');
                        el.scrollTop=el.scrollHeight;
                      }
                      async function loadChat(){
                        var tripId=activeTripId(),aid=accountId(),token=sessionToken();
                        if(!tripId||!aid||!token||typeof CORE==='undefined'||!CORE)return;
                        try{
                          var r=await fetch(CORE+'?action=trip-chat-list',{method:'POST',headers:headers(),body:JSON.stringify({role:'customer',tripId:tripId,accountId:aid,sessionToken:token})});
                          var j=await r.json();
                          if(r.ok)renderChat(j.messages||[]);
                        }catch(e){}
                      }
                      async function sendChat(){
                        var input=document.getElementById('rotaChatInput');
                        var msg=(input&&input.value||'').trim();
                        if(!msg)return;
                        var tripId=activeTripId(),aid=accountId(),token=sessionToken();
                        if(!tripId||!aid||!token)return;
                        try{
                          var r=await fetch(CORE+'?action=trip-chat-send',{method:'POST',headers:headers(),body:JSON.stringify({role:'customer',tripId:tripId,accountId:aid,sessionToken:token,message:msg})});
                          if(r.ok){input.value='';await loadChat();}
                        }catch(e){}
                      }
                      chatBtn.onclick=function(){chatPanel.style.display='block';loadChat();};
                      document.getElementById('rotaChatClose').onclick=function(){chatPanel.style.display='none';};
                      document.getElementById('rotaChatSend').onclick=sendChat;
                      document.getElementById('rotaChatInput').addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();sendChat();}});
                      setInterval(function(){if(chatPanel.style.display==='block')loadChat();},2500);

                      var driverMarker = null;
                      var nearbyMarkers = [];

                      function clearNearbyMarkers() {
                        try {
                          if (typeof map !== 'undefined' && map) {
                            nearbyMarkers.forEach(function(m){ try { map.removeLayer(m); } catch(e) {} });
                          }
                        } catch(e) {}
                        nearbyMarkers = [];
                      }

                      function drawNearbyDrivers(list) {
                        clearNearbyMarkers();
                        try {
                          if (typeof L === 'undefined' || typeof map === 'undefined' || !map) return;
                          (list || []).forEach(function(d) {
                            var lat = Number(d.lat), lng = Number(d.lng);
                            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
                            var icon = L.divIcon({
                              className:'',
                              html:'<div style="width:28px;height:28px;border-radius:50%;background:#ffffff;border:2px solid #081329;display:flex;align-items:center;justify-content:center;font-size:15px;box-shadow:0 3px 9px rgba(0,0,0,.18)">🚗</div>',
                              iconSize:[28,28],
                              iconAnchor:[14,14]
                            });
                            var m = L.marker([lat,lng], {icon:icon, zIndexOffset:1500}).addTo(map);
                            nearbyMarkers.push(m);
                          });
                        } catch(e) {}
                      }

                      function getState() {
                        try { return JSON.parse(localStorage.getItem('rota_customer') || '{}') || {}; }
                        catch(e) { return {}; }
                      }
                      function accountId() {
                        var c = getState();
                        return localStorage.getItem('rota_customer_account_id') || c.accountId || c.account_id || c.id || '';
                      }
                      function sessionToken() {
                        var c = getState();
                        return localStorage.getItem('rota_customer_session') || c.sessionToken || c.session_token || c.token || '';
                      }
                      function activeTripId() {
                        return localStorage.getItem('rota_active_trip_id') || '';
                      }
                      function headers() {
                        var h = {'Content-Type':'application/json'};
                        try {
                          if (typeof KEY !== 'undefined' && KEY) h.apikey = KEY;
                          else if (typeof SUPA_KEY !== 'undefined' && SUPA_KEY) h.apikey = SUPA_KEY;
                        } catch(e) {}
                        return h;
                      }
                      function updateMarker(lat,lng) {
                        try {
                          if (typeof L === 'undefined' || typeof map === 'undefined' || !map) return;
                          if (!driverMarker) {
                            var icon = L.divIcon({
                              className:'',
                              html:'<div style="width:38px;height:38px;border-radius:50%;background:#081329;border:3px solid #f6be35;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 4px 12px rgba(0,0,0,.25)">🚗</div>',
                              iconSize:[38,38],
                              iconAnchor:[19,19]
                            });
                            driverMarker = L.marker([lat,lng], {icon:icon, zIndexOffset:5000}).addTo(map);
                          } else {
                            driverMarker.setLatLng([lat,lng]);
                          }
                        } catch(e) {}
                      }
                      async function pollDriver() {
                        var tripId = activeTripId();
                        var aid = accountId();
                        var token = sessionToken();
                        if (!tripId || !aid || !token || typeof CORE === 'undefined' || !CORE) {
                          box.style.display = 'none';
                          return;
                        }
                        try {
                          var r = await fetch(CORE + '?action=customer-trip-code', {
                            method:'POST',
                            headers:headers(),
                            body:JSON.stringify({tripId:tripId, accountId:aid, sessionToken:token})
                          });
                          var j = await r.json();
                          if (!r.ok) return;
                          if (j.status === 'accepted' && j.driverLocation) {
                            box.style.display = 'block';
                            chatBtn.style.display = 'block';
                            document.getElementById('rotaLiveEta').textContent = (j.etaMinutes || 1) + ' dk';
                            document.getElementById('rotaLiveDistance').textContent = (j.driverLocation.distanceKm || 0).toFixed(1) + ' km uzakta';
                            updateMarker(Number(j.driverLocation.lat), Number(j.driverLocation.lng));
                          } else if (j.status === 'completed' || j.status === 'cancelled') {
                            box.style.display = 'none';
                            chatBtn.style.display = 'none';
                            chatPanel.style.display = 'none';
                            if (driverMarker && typeof map !== 'undefined' && map) {
                              try { map.removeLayer(driverMarker); } catch(e) {}
                              driverMarker = null;
                            }
                          }
                        } catch(e) {}
                      }
                      async function pollNearbyDrivers() {
                        var tripId = activeTripId();
                        var aid = accountId();
                        var token = sessionToken();
                        if (typeof CORE === 'undefined' || !CORE) return;

                        try {
                          if (tripId && aid && token) {
                            var tr = await fetch(CORE + '?action=customer-trip-code', {
                              method:'POST',
                              headers:headers(),
                              body:JSON.stringify({tripId:tripId, accountId:aid, sessionToken:token})
                            });
                            var tj = await tr.json().catch(function(){return {}});
                            if (tr.ok && tj.status === 'accepted') {
                              clearNearbyMarkers();
                              return;
                            }
                          }
                        } catch(e) {}

                        if (!navigator.geolocation) return;
                        navigator.geolocation.getCurrentPosition(async function(pos) {
                          try {
                            var r = await fetch(CORE + '?action=nearby-map-drivers', {
                              method:'POST',
                              headers:headers(),
                              body:JSON.stringify({
                                lat:Number(pos.coords.latitude),
                                lng:Number(pos.coords.longitude),
                                radiusKm:15
                              })
                            });
                            var j = await r.json();
                            if (!r.ok) return;
                            drawNearbyDrivers(j.drivers || []);
                          } catch(e) {}
                        }, function(){}, {enableHighAccuracy:true, maximumAge:10000, timeout:12000});
                      }

                      setInterval(pollDriver, 3000);
                      setTimeout(pollDriver, 1200);
                      setInterval(pollNearbyDrivers, 5000);
                      setTimeout(pollNearbyDrivers, 1600);
                    })();
                    """.trimIndent(),
                    null
                )
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
                        100
                    )
                }
            }
        }

        web.loadUrl("https://rota-musteri-final19.onrender.com")
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == 100) {
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
