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
                      var liveRouteLayer = null;
                      var lastLiveRouteAt = 0;
                      var lastLiveRouteKey = '';

                      function isGoogleMap(){
                        try {
                          return !!(window.google && google.maps && typeof map !== 'undefined' && map &&
                            typeof map.getCenter === 'function' && typeof map.panTo === 'function');
                        } catch(e) { return false; }
                      }

                      function removeAnyMarker(m){
                        try {
                          if(!m)return;
                          if(m.setMap) m.setMap(null);
                          else if(typeof map!=='undefined' && map && map.removeLayer) map.removeLayer(m);
                        } catch(e) {}
                      }

                      function clearNearbyMarkers() {
                        nearbyMarkers.forEach(removeAnyMarker);
                        nearbyMarkers = [];
                      }

                      function makeGoogleCarIcon(size,assigned){
                        var fill=assigned?'#081329':'#ffffff';
                        var stroke=assigned?'#f6be35':'#081329';
                        var svg='<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">'+
                          '<circle cx="32" cy="32" r="28" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+(assigned?5:3)+'"/>'+
                          '<text x="32" y="42" text-anchor="middle" font-size="'+(assigned?31:27)+'">🚗</text></svg>';
                        return {
                          url:'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(svg),
                          scaledSize:new google.maps.Size(size,size),
                          anchor:new google.maps.Point(size/2,size/2)
                        };
                      }

                      function drawNearbyDrivers(list) {
                        clearNearbyMarkers();
                        try {
                          if (typeof map === 'undefined' || !map) return;
                          (list || []).forEach(function(d) {
                            var lat = Number(d.lat), lng = Number(d.lng);
                            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

                            if(isGoogleMap() && typeof google.maps.Marker==='function'){
                              var gm=new google.maps.Marker({
                                position:{lat:lat,lng:lng},
                                map:map,
                                icon:makeGoogleCarIcon(34,false),
                                zIndex:5000,
                                optimized:false,
                                title:'Çevrimiçi sürücü'
                              });
                              nearbyMarkers.push(gm);
                              return;
                            }

                            if (typeof L !== 'undefined' && L.marker) {
                              var pane='rotaNearbyPane';
                              try{
                                if(map.createPane && !map.getPane(pane)){
                                  var pp=map.createPane(pane);
                                  pp.style.zIndex='6200';
                                }
                              }catch(e){}
                              var icon = L.divIcon({
                                className:'',
                                html:'<div style="width:32px;height:32px;border-radius:50%;background:#fff;border:2px solid #081329;display:flex;align-items:center;justify-content:center;font-size:17px;box-shadow:0 3px 10px rgba(0,0,0,.22)">🚗</div>',
                                iconSize:[32,32],
                                iconAnchor:[16,16]
                              });
                              var lm = L.marker([lat,lng], {icon:icon,pane:pane,zIndexOffset:2500}).addTo(map);
                              nearbyMarkers.push(lm);
                            }
                          });
                        } catch(e) {}
                      }

                      function getState() {
                        try { return JSON.parse(localStorage.getItem('rota_customer') || '{}') || {}; }
                        catch(e) { return {}; }
                      }
                      function accountId() {
                        var cc = getState();
                        return localStorage.getItem('rota_customer_account_id') || cc.accountId || cc.account_id || cc.id || '';
                      }
                      function sessionToken() {
                        var cc = getState();
                        return localStorage.getItem('rota_customer_session') || cc.sessionToken || cc.session_token || cc.token || '';
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
                          if (!Number.isFinite(lat) || !Number.isFinite(lng) || typeof map === 'undefined' || !map) return;

                          if (isGoogleMap() && typeof google.maps.Marker === 'function') {
                            if (!driverMarker || !driverMarker.setPosition) {
                              removeAnyMarker(driverMarker);
                              driverMarker = new google.maps.Marker({
                                position:{lat:lat,lng:lng},
                                map:map,
                                icon:makeGoogleCarIcon(58,true),
                                zIndex:999999,
                                optimized:false,
                                title:'Sürücünüz'
                              });
                            } else {
                              driverMarker.setPosition({lat:lat,lng:lng});
                              if(driverMarker.setMap)driverMarker.setMap(map);
                            }
                            return;
                          }

                          if (typeof L !== 'undefined' && L.marker) {
                            var paneName='rotaDriverPane';
                            try {
                              if (map.createPane && !map.getPane(paneName)) {
                                var p=map.createPane(paneName);
                                p.style.zIndex='9999';
                                p.style.pointerEvents='none';
                              }
                            } catch(e) {}
                            if (!driverMarker || !driverMarker.setLatLng) {
                              removeAnyMarker(driverMarker);
                              var icon = L.divIcon({
                                className:'',
                                html:'<div style="width:54px;height:54px;border-radius:50%;background:#081329;border:4px solid #f6be35;display:flex;align-items:center;justify-content:center;font-size:29px;box-shadow:0 0 0 7px rgba(246,190,53,.25),0 6px 20px rgba(0,0,0,.4)">🚗</div>',
                                iconSize:[54,54],
                                iconAnchor:[27,27]
                              });
                              driverMarker = L.marker([lat,lng], {icon:icon, pane:paneName, zIndexOffset:10000}).addTo(map);
                            } else {
                              driverMarker.setLatLng([lat,lng]);
                            }
                          }
                        } catch(e) {}
                      }

                      function clearLiveRoute(){
                        try{
                          if(liveRouteLayer){
                            if(liveRouteLayer.setMap) liveRouteLayer.setMap(null);
                            else if(typeof map!=='undefined' && map && map.removeLayer) map.removeLayer(liveRouteLayer);
                          }
                        }catch(e){}
                        liveRouteLayer=null;
                      }

                      async function drawLiveRoute(driverLat,driverLng,pickupLat,pickupLng){
                        if(![driverLat,driverLng,pickupLat,pickupLng].every(Number.isFinite))return;
                        var key=[driverLat.toFixed(4),driverLng.toFixed(4),pickupLat.toFixed(4),pickupLng.toFixed(4)].join('|');
                        var now=Date.now();
                        if(key===lastLiveRouteKey && now-lastLiveRouteAt<6000)return;
                        lastLiveRouteKey=key; lastLiveRouteAt=now;
                        try{
                          var geoUrl=(typeof GEO!=='undefined'&&GEO)?GEO:'https://ftltemgtzkjfnkxsxxmd.supabase.co/functions/v1/rota2-geo';
                          var rr=await fetch(geoUrl+'?action=route',{
                            method:'POST',
                            headers:headers(),
                            body:JSON.stringify({fl:driverLat,fn:driverLng,tl:pickupLat,tn:pickupLng})
                          });
                          var rj=await rr.json();
                          if(!rr.ok||!rj.geometry||!rj.geometry.coordinates)return;
                          var coords=rj.geometry.coordinates;
                          clearLiveRoute();

                          if(isGoogleMap() && typeof google.maps.Polyline==='function'){
                            var path=coords.map(function(pt){return {lat:Number(pt[1]),lng:Number(pt[0])};});
                            liveRouteLayer=new google.maps.Polyline({
                              path:path,
                              geodesic:true,
                              strokeColor:'#111111',
                              strokeOpacity:0.95,
                              strokeWeight:7,
                              map:map,
                              zIndex:9000
                            });
                          }else if(typeof L!=='undefined' && L.polyline){
                            var latlngs=coords.map(function(pt){return [Number(pt[1]),Number(pt[0])];});
                            liveRouteLayer=L.polyline(latlngs,{color:'#111111',weight:7,opacity:.95}).addTo(map);
                          }
                        }catch(e){}
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
                            var dlat=Number(j.driverLocation.lat), dlng=Number(j.driverLocation.lng);
                            var plat=Number(j.pickupLocation&&j.pickupLocation.lat), plng=Number(j.pickupLocation&&j.pickupLocation.lng);
                            box.style.display = 'block';
                            chatBtn.style.display = 'block';
                            document.getElementById('rotaLiveEta').textContent = (j.etaMinutes || 1) + ' dk';
                            document.getElementById('rotaLiveDistance').textContent = (Number(j.driverLocation.distanceKm||0)).toFixed(1) + ' km uzakta';
                            updateMarker(dlat,dlng);
                            drawLiveRoute(dlat,dlng,plat,plng);
                          } else if (j.status === 'completed' || j.status === 'cancelled') {
                            box.style.display = 'none';
                            chatBtn.style.display = 'none';
                            chatPanel.style.display = 'none';
                            removeAnyMarker(driverMarker);
                            driverMarker = null;
                            clearLiveRoute();
                          }
                        } catch(e) {}
                      }

                      async function fetchNearbyAt(lat,lng){
                        if(!Number.isFinite(lat)||!Number.isFinite(lng)||typeof CORE==='undefined'||!CORE)return;
                        try{
                          var r=await fetch(CORE+'?action=nearby-map-drivers',{
                            method:'POST',
                            headers:headers(),
                            body:JSON.stringify({lat:lat,lng:lng,radiusKm:20})
                          });
                          var j=await r.json();
                          if(!r.ok)return;
                          drawNearbyDrivers(j.drivers||[]);
                        }catch(e){}
                      }

                      async function pollNearbyDrivers() {
                        // Öncelik: müşterinin seçtiği alış noktası. GPS yalnızca yedek.
                        try{
                          if(typeof pickup!=='undefined' && pickup &&
                             Number.isFinite(Number(pickup.lat)) && Number.isFinite(Number(pickup.lng))){
                            await fetchNearbyAt(Number(pickup.lat),Number(pickup.lng));
                            return;
                          }
                        }catch(e){}
                        if(!navigator.geolocation)return;
                        navigator.geolocation.getCurrentPosition(function(pos){
                          fetchNearbyAt(Number(pos.coords.latitude),Number(pos.coords.longitude));
                        },function(){},{enableHighAccuracy:true,maximumAge:8000,timeout:12000});
                      }

                      var lastPreviewKey='';
                      async function previewSelectedRoute(){
                        try{
                          if(activeTripId()) return;
                          if(typeof pickup==='undefined'||typeof target==='undefined'||!pickup||!target)return;
                          var a=Number(pickup.lat),b=Number(pickup.lng),x=Number(target.lat),y=Number(target.lng);
                          if(![a,b,x,y].every(Number.isFinite))return;
                          var key=[a.toFixed(5),b.toFixed(5),x.toFixed(5),y.toFixed(5)].join('|');
                          if(key===lastPreviewKey)return;
                          lastPreviewKey=key;
                          await drawLiveRoute(a,b,x,y);
                        }catch(e){}
                      }
                      setInterval(previewSelectedRoute,1200);
                      setTimeout(previewSelectedRoute,1800);

                      // Dat Dat benzeri daha temiz müşteri ekranı görünümü.
                      (function installCleanRotaUi(){
                        var st=document.createElement('style');
                        st.id='rotaCleanUi';
                        st.textContent=
                          '.top{left:16px!important;right:16px!important;top:14px!important}'+
                          '.box{border-radius:26px!important;box-shadow:0 10px 28px rgba(15,23,42,.14)!important}'+
                          '.addr{min-height:68px!important;padding:12px 62px 12px 18px!important}'+
                          '.addr small{font-size:12px!important}.addr b{font-size:18px!important}'+
                          '.search{margin-top:10px!important;background:rgba(255,255,255,.96)!important}'+
                          '.search input{font-size:18px!important;padding:16px 10px!important}'+
                          '.sheet{left:0!important;right:0!important;bottom:0!important;border-radius:32px 32px 0 0!important;padding:13px 18px 20px!important;box-shadow:0 -10px 30px rgba(15,23,42,.14)!important}'+
                          '.brand{font-size:21px!important}.route{font-size:14px!important;margin-top:5px!important}'+
                          '.vehicles{display:grid!important;grid-template-columns:1fr 1fr!important;gap:10px!important;overflow:visible!important}'+
                          '.v{width:auto!important;min-width:0!important;flex:none!important;border-radius:20px!important;padding:13px!important;min-height:92px!important}'+
                          '.v.on{border:3px solid #f6be35!important;background:#fffdf5!important}'+
                          '.call{border-radius:22px!important;padding:17px!important;font-size:19px!important;box-shadow:0 6px 18px rgba(246,190,53,.28)!important}'+
                          '#rotaLiveDriverBox{top:14px!important;left:18px!important;right:18px!important;border-radius:22px!important;padding:13px 16px!important}'+
                          '#rotaChatButton{bottom:24px!important;border-radius:24px!important;padding:13px 17px!important}';
                        document.head.appendChild(st);
                      })();

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
