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

                      var box = document.createElement('div');
                      box.id = 'rotaLiveDriverBox';
                      box.style.cssText = 'display:none;position:fixed;left:14px;right:14px;top:18px;z-index:999999;background:#081329;color:white;border-radius:16px;padding:12px 14px;box-shadow:0 8px 24px rgba(0,0,0,.24);font-family:Arial,sans-serif';
                      box.innerHTML = '<div style="font-size:12px;opacity:.8">Sürücü size geliyor</div><div id="rotaLiveEta" style="font-size:24px;font-weight:900;margin-top:2px">-- dk</div><div id="rotaLiveDistance" style="font-size:12px;opacity:.85;margin-top:2px"></div>';
                      document.body.appendChild(box);

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
                            document.getElementById('rotaLiveEta').textContent = (j.etaMinutes || 1) + ' dk';
                            document.getElementById('rotaLiveDistance').textContent = (j.driverLocation.distanceKm || 0).toFixed(1) + ' km uzakta';
                            updateMarker(Number(j.driverLocation.lat), Number(j.driverLocation.lng));
                          } else if (j.status === 'completed' || j.status === 'cancelled') {
                            box.style.display = 'none';
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
                        if (!aid || !token || typeof CORE === 'undefined' || !CORE) return;

                        try {
                          if (tripId) {
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
                            var r = await fetch(CORE + '?action=customer-nearby-drivers', {
                              method:'POST',
                              headers:headers(),
                              body:JSON.stringify({
                                accountId:aid,
                                sessionToken:token,
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
