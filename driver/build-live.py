#!/usr/bin/env python3
"""Build ROTA Driver live entry from the current stable dashboard without altering its trip logic."""
from pathlib import Path
from urllib.request import urlopen, Request
import shutil

base = "https://rota-surucu-final29.onrender.com/"
out = Path("driver-live-public")
out.mkdir(parents=True, exist_ok=True)
req = Request(base, headers={"User-Agent": "ROTA-Driver-Live-Build/1.0", "Cache-Control": "no-cache"})
with urlopen(req, timeout=100) as response:
    html = response.read().decode("utf-8")
if "rotaFinal17" not in html or "</head>" not in html.lower() or "</body>" not in html.lower():
    raise SystemExit("Stable driver dashboard marker missing. Refusing to publish.")
prestyle = """<style id="rota-auth-no-flash">
#rotaDriverAuth:not(.rota-login38){visibility:hidden!important}
</style>"""
html = html.replace("</head>", prestyle + "\n</head>", 1)
html = html.replace("</body>", """<script src="/login-gold-v38.js"></script>
<script src="/login-password-align-v40.js"></script>
<script>
window.addEventListener('load',function(){
  setTimeout(function(){
    var a=document.getElementById('rotaDriverAuth');
    if(a && !a.classList.contains('rota-login38')) a.style.visibility='visible';
  },6000);
});
</script>
</body>""", 1)
# Mirror the already tested Leaflet assets locally. The live GPS map previously
# depended on a third-party script host which can fail on mobile networks.
# Existing driver actions, positions, and ride backend remain untouched.
for filename in ("leaflet.js", "leaflet.css"):
    asset_data = None
    for origin in ("https://rota-musteri-final50.onrender.com/",
                   "https://rota-musteri-giris-yeni.onrender.com/"):
        try:
            asset_request = Request(origin + filename, headers={"User-Agent": "ROTA-Driver-Map-Recovery"})
            with urlopen(asset_request, timeout=35) as asset_response:
                data = asset_response.read()
                content_type = asset_response.headers.get("Content-Type", "")
            if len(data) > 5000 and "text/html" not in content_type.lower():
                asset_data = data
                print("ROTA local map dependency:", filename, len(data), "bytes", flush=True)
                break
        except Exception as exc:
            print("Map asset source unavailable:", filename, repr(exc), flush=True)
    if not asset_data:
        raise SystemExit("Cannot safely publish without verified local map asset: " + filename)
    (out / filename).write_bytes(asset_data)

html = html.replace("https://unpkg.com/leaflet@1.9.4/dist/leaflet.js", "/leaflet.js")
html = html.replace("https://unpkg.com/leaflet@1.9.4/dist/leaflet.css", "/leaflet.css")
# Existing map initialization uses the same Leaflet API. Only the asset URL changes.
if "rota-final26-real-live-map-js" not in html or "/leaflet.js" not in html:
    raise SystemExit("Driver map structure changed: refusing to publish.")
# Fix false GPS coordinates: Number(null) used to become 0, so absent cached
# coordinates appeared as (0, 0) in the Atlantic Ocean. Do not show a driver
# pin on the ocean when location permission was refused or data is missing.
map_fixes = (
    ("const num26=v=>{const x=Number(v);return Number.isFinite(x)?x:null};",
     "const num26=v=>{if(v===null||v===undefined||String(v).trim()==='')return null;const x=Number(v);return Number.isFinite(x)?x:null};"),
    ("const valid26=(a,b)=>a!==null&&b!==null&&a>=-90&&a<=90&&b>=-180&&b<=180;",
     "const valid26=(a,b)=>a!==null&&b!==null&&a>=-90&&a<=90&&b>=-180&&b<=180&&!(a===0&&b===0);")
)
for old, new in map_fixes:
    if html.count(old) != 1:
        raise SystemExit("Driver GPS validation signature changed; refusing to publish.")
    html = html.replace(old, new, 1)
print("Driver map invalid coordinate guards installed", flush=True)
(out / "index.html").write_text(html, encoding="utf-8")
for name in ["login-gold-v38.js", "login-password-align-v40.js"]:
    shutil.copyfile(Path("driver") / name, out / name)
print("ROTA Driver entry built from final29, login initialized before first render")
