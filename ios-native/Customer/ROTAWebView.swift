import SwiftUI
import WebKit

struct ROTAWebView: UIViewRepresentable {
    let urlString: String

    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        configuration.allowsInlineMediaPlayback = true

        let liveTrackingScript = #"""
        (function() {
          if (window.__rotaLiveTrackingInstalled) return;
          window.__rotaLiveTrackingInstalled = true;

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
            var tripId=(localStorage.getItem('rota_active_trip_id')||''),aid=aid(),token=stok();
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
            var tripId=(localStorage.getItem('rota_active_trip_id')||''),aid=aid(),token=stok();
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
          function clearNearbyMarkers(){
            try{
              if(typeof map!=='undefined'&&map){
                nearbyMarkers.forEach(function(m){try{map.removeLayer(m)}catch(e){}});
              }
            }catch(e){}
            nearbyMarkers=[];
          }
          function drawNearbyDrivers(list){
            clearNearbyMarkers();
            try{
              if(typeof L==='undefined'||typeof map==='undefined'||!map)return;
              (list||[]).forEach(function(d){
                var lat=Number(d.lat),lng=Number(d.lng);
                if(!Number.isFinite(lat)||!Number.isFinite(lng))return;
                var icon=L.divIcon({className:'',html:'<div style="width:28px;height:28px;border-radius:50%;background:#ffffff;border:2px solid #081329;display:flex;align-items:center;justify-content:center;font-size:15px;box-shadow:0 3px 9px rgba(0,0,0,.18)">🚗</div>',iconSize:[28,28],iconAnchor:[14,14]});
                nearbyMarkers.push(L.marker([lat,lng],{icon:icon,zIndexOffset:1500}).addTo(map));
              });
            }catch(e){}
          }
          function state(){ try{return JSON.parse(localStorage.getItem('rota_customer')||'{}')||{}}catch(e){return {}} }
          function aid(){ var c=state(); return localStorage.getItem('rota_customer_account_id')||c.accountId||c.account_id||c.id||''; }
          function stok(){ var c=state(); return localStorage.getItem('rota_customer_session')||c.sessionToken||c.session_token||c.token||''; }
          function headers(){ var h={'Content-Type':'application/json'}; try{ if(typeof KEY!=='undefined'&&KEY)h.apikey=KEY; else if(typeof SUPA_KEY!=='undefined'&&SUPA_KEY)h.apikey=SUPA_KEY; }catch(e){} return h; }
          function updateMarker(lat,lng){
            try{
              if(typeof L==='undefined'||typeof map==='undefined'||!map)return;
              if(!driverMarker){
                var icon=L.divIcon({className:'',html:'<div style="width:38px;height:38px;border-radius:50%;background:#081329;border:3px solid #f6be35;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 4px 12px rgba(0,0,0,.25)">🚗</div>',iconSize:[38,38],iconAnchor:[19,19]});
                driverMarker=L.marker([lat,lng],{icon:icon,zIndexOffset:5000}).addTo(map);
              }else driverMarker.setLatLng([lat,lng]);
            }catch(e){}
          }
          async function poll(){
            var tripId=localStorage.getItem('rota_active_trip_id')||'';
            if(!tripId||!aid()||!stok()||typeof CORE==='undefined'||!CORE){box.style.display='none';return;}
            try{
              var r=await fetch(CORE+'?action=customer-trip-code',{method:'POST',headers:headers(),body:JSON.stringify({tripId:tripId,accountId:aid(),sessionToken:stok()})});
              var j=await r.json();
              if(!r.ok)return;
              if(j.status==='accepted'&&j.driverLocation){
                box.style.display='block';
                chatBtn.style.display='block';
                document.getElementById('rotaLiveEta').textContent=(j.etaMinutes||1)+' dk';
                document.getElementById('rotaLiveDistance').textContent=(j.driverLocation.distanceKm||0).toFixed(1)+' km uzakta';
                updateMarker(Number(j.driverLocation.lat),Number(j.driverLocation.lng));
              }else if(j.status==='completed'||j.status==='cancelled'){
                box.style.display='none';
                chatBtn.style.display='none';
                chatPanel.style.display='none';
                if(driverMarker&&typeof map!=='undefined'&&map){try{map.removeLayer(driverMarker)}catch(e){} driverMarker=null;}
              }
            }catch(e){}
          }
          async function pollNearby(){
            var tripId=localStorage.getItem('rota_active_trip_id')||'';
            if(typeof CORE==='undefined'||!CORE)return;
            try{
              if(tripId&&aid()&&stok()){
                var tr=await fetch(CORE+'?action=customer-trip-code',{method:'POST',headers:headers(),body:JSON.stringify({tripId:tripId,accountId:aid(),sessionToken:stok()})});
                var tj=await tr.json().catch(function(){return {}});
                if(tr.ok&&tj.status==='accepted'){clearNearbyMarkers();return;}
              }
            }catch(e){}
            if(!navigator.geolocation)return;
            navigator.geolocation.getCurrentPosition(async function(pos){
              try{
                var r=await fetch(CORE+'?action=nearby-map-drivers',{method:'POST',headers:headers(),body:JSON.stringify({lat:Number(pos.coords.latitude),lng:Number(pos.coords.longitude),radiusKm:15})});
                var j=await r.json();
                if(!r.ok)return;
                drawNearbyDrivers(j.drivers||[]);
              }catch(e){}
            },function(){},{enableHighAccuracy:true,maximumAge:10000,timeout:12000});
          }
          setInterval(poll,3000);
          setTimeout(poll,1200);
          setInterval(pollNearby,5000);
          setTimeout(pollNearby,1600);
        })();
        """#
        configuration.userContentController.addUserScript(
            WKUserScript(source: liveTrackingScript, injectionTime: .atDocumentEnd, forMainFrameOnly: true)
        )

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = true
        webView.scrollView.contentInsetAdjustmentBehavior = .automatic

        if let url = URL(string: urlString) {
            webView.load(URLRequest(url: url))
        }
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
        func webView(_ webView: WKWebView,
                     decidePolicyFor navigationAction: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            decisionHandler(.allow)
        }
    }
}
