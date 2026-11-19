#!/usr/bin/env python3
"""Create approved customer login release based on the unchanged production final50 page."""
from pathlib import Path
from urllib.request import urlopen, Request
from urllib.error import HTTPError, URLError
import time
import re
import sys

source = "https://rota-musteri-final50.onrender.com/"
out = Path("customer-approved-public")
out.mkdir(exist_ok=True)
html = None
for attempt in range(1, 7):
    try:
        req = Request(source, headers={"User-Agent": "Mozilla/5.0 ROTA-Customer-Theme-Build", "Cache-Control": "no-cache"})
        with urlopen(req, timeout=60) as response:
            html = response.read().decode("utf-8")
        print("Downloaded final50 source: %s bytes (attempt %s)" % (len(html), attempt), flush=True)
        break
    except Exception as exc:
        print("final50 download attempt %s failed: %r" % (attempt, exc), flush=True)
        if attempt < 6:
            time.sleep(3 * attempt)
if not html:
    raise SystemExit("Cannot safely publish: production final50 HTML could not be downloaded.")
if not re.search(r"<html\b", html, re.I) or not re.search(r"</body\s*>", html, re.I):
    raise SystemExit("Cannot safely publish: final50 response was not a complete HTML page.")
# Keep every existing JS/auth feature intact. Adapt to markup without hardcoded attribute ordering.
auth_matches = re.findall(r'id\s*=\s*"([^"]+)"', html, flags=re.I)
required = ["authOverlay", "phone", "password", "authBtn", "tabLogin", "tabReg"]
print("Final50 login controls: %s" % {name:(name in auth_matches) for name in required},flush=True)
if not all(x in auth_matches for x in required):
    raise SystemExit("Cannot safely publish: current customer login structure changed.")
# Diagnose the existing registration wiring without reading or changing user data.
for needle in ["tabReg", "tabLogin", "authBtn", "register", "registerExtra", "registerFields"]:
    positions = [m.start() for m in re.finditer(re.escape(needle), html, re.I)]
    print("REGISTER_WIRING", needle, "occurrences",len(positions),flush=True)
    for idx in positions[-5:]:
        sample=html[max(0,idx-170):idx+520]
        sample=re.sub(r'(?i)(apikey|access_token|authorization|secret)\\s*[:=]\\s*[^,;\\s]+',r'\\1=[omitted]',sample)
        print("REGISTER_SNIPPET",repr(sample[:670]),flush=True)
# Bind signup email into the existing registration payload only. Keep login unchanged.
target = "const payload={role:'customer',phone,password};"
if html.count(target) != 1:
    raise SystemExit("Customer signup handler changed; refusing to alter the existing application.")
html = html.replace(target,
    "const payload={role:'customer',phone,password};"
    "if(isReg){payload.email=String(document.getElementById('rotaEmail')?.value||'').trim().toLowerCase();"
    "if(!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(payload.email)){"
    "if(msg)msg.textContent='Geçerli e-posta adresinizi girin.';return;}}",
    1)
# Inspect current deployed customer layout and click bindings, do not expose credentials.
for term in ["rotaGoogleVisual","#map,.map","Rezervasyon Yap","Araç Çağır","Kadın Sürücü Çağır","Nereye gidiyoruz","Kayıtlı Konumlarım","rotaSectionModal"]:
    hits=[m.start() for m in re.finditer(re.escape(term),html,re.I)]
    print("DEBUG_UI",term,"hits",len(hits),flush=True)
    for at in hits[:4]:
        print("DEBUG_CONTEXT",repr(html[max(0,at-280):at+500]),flush=True)
for match in re.finditer(r'<button\\b[^>]*>(?:[^<]{0,90})</button>',html,re.I):
    if any(t in match.group() for t in ["Rezervasyon","Araç Çağır","Kadın Sürücü","Gör"]):
        print("DEBUG_BUTTON",match.group()[:350],flush=True)
# Focused audit of the r33 replacement home screen event handlers.
for term in ["function openDrawer","function init33","r33Reserve').onclick","r33Reserve\").onclick","r33Call","r33MapCanvas","r33SearchBox","function callVehicle","function openReservation","r33Reserve","r33Search"]:
    matches=[m.start() for m in re.finditer(re.escape(term),html)]
    print("R33_AUDIT",term,"count",len(matches),flush=True)
    for at in matches[-3:]:
        print("R33_CODE",repr(html[max(0,at-700):at+1300])[:2100],flush=True)
style = Path("customer/login-approved.css").read_text(encoding="utf-8")
script = Path("customer/login-approved.js").read_text(encoding="utf-8")
dashboard_script = Path("customer/dashboard-repair.js").read_text(encoding="utf-8")
preload = '<style id="rotaCustomerHideBeforeReady">#authOverlay:not(.rotaCustomerTheme50){visibility:hidden!important}</style>'
html = re.sub(r"</head\s*>",lambda match: preload + "\n<style>" + style + "</style>\n" + match.group(),html,count=1,flags=re.I)
fallback = """
<script>
(function(){
 try {
""" + script + """
 } catch(e) {
   console.error("ROTA customer theme failed", e);
   document.getElementById("rotaCustomerHideBeforeReady")?.remove();
 }
 setTimeout(function(){document.getElementById("rotaCustomerHideBeforeReady")?.remove();},4000);
})();
</script>
"""
html = re.sub(r"</body\s*>", lambda match:fallback + "\n" + match.group(), html, count=1, flags=re.I)
html = re.sub(r"</body\s*>", lambda match:"<script>\n"+dashboard_script+"\n</script>\n"+match.group(), html, count=1, flags=re.I)
# Restore interactive controls while preserving the original backend.
controls_script = Path("customer/ui-controls-fix.js").read_text(encoding="utf-8")
if not controls_script.strip().endswith("})();"):
    raise SystemExit("Customer UI controls script is truncated.")
html = re.sub(r"</body\s*>", lambda match: "<script id='rota-ui-controls-fix'>" + controls_script + "</script>" + match.group(), html, count=1, flags=re.I)
# Preserve the local JavaScript / CSS dependencies used by final50.
# Missing /leaflet.js prevents the map and connected event handlers from initializing.
from urllib.parse import urljoin
local_assets={"/leaflet.js"}
for asset_path in re.findall(r'<script[^>]+src="/([^"]+)"', html, flags=re.I):
    local_assets.add("/"+asset_path.split("?")[0])
for asset_path in re.findall(r'<link[^>]+href="/([^"]+)"', html, flags=re.I):
    local_assets.add("/"+asset_path.split("?")[0])
for asset in sorted(local_assets):
    if asset.startswith("//") or ".." in asset or not asset.startswith("/"):
        raise SystemExit("Unsafe local asset path: "+asset)
    filename=out / asset.lstrip("/")
    filename.parent.mkdir(parents=True,exist_ok=True)
    asset_req=Request(urljoin(source,asset),headers={"User-Agent":"Mozilla/5.0 ROTA-Customer-Theme-Build"})
    with urlopen(asset_req,timeout=65) as response:
        data=response.read()
        content_type=response.headers.get("Content-Type","")
    if len(data)<100 or "text/html" in content_type.lower():
        raise SystemExit("Asset is missing or invalid: "+asset)
    filename.write_bytes(data)
    print("RESTORED_LOCAL_ASSET",asset,len(data),"bytes",flush=True)
if "/leaflet.js" not in local_assets:
    raise SystemExit("Expected local leaflet.js dependency not found; refusing release.")
(out / "index.html").write_text(html, encoding="utf-8")
print("ROTA customer themed release built, original final50 logic retained.",flush=True)
