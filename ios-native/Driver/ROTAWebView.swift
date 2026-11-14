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
        configuration.mediaTypesRequiringUserActionForPlayback = []

        let driverChatScript = #"""
            (function(){
            if(window.__rotaDriverChatInstalled)return;
            window.__rotaDriverChatInstalled=true;
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
            setInterval(findTrip,3000); setTimeout(findTrip,1000);
            setInterval(function(){if(panel.style.display==='block')load();},2500);
          })();

        """#
        configuration.userContentController.addUserScript(
            WKUserScript(source: driverChatScript, injectionTime: .atDocumentEnd, forMainFrameOnly: true)
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
