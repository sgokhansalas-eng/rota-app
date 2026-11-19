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
style = Path("customer/login-approved.css").read_text(encoding="utf-8")
script = Path("customer/login-approved.js").read_text(encoding="utf-8")
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
(out / "index.html").write_text(html, encoding="utf-8")
print("ROTA customer themed release built, original final50 logic retained.",flush=True)
