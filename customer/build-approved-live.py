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
auth_matches = re.findall(r'id\s*=\s*["\']([^"\']+)["\']', html, flags=re.I)
print("Auth ID availability: %s" % {name:(name in auth_matches) for name in ["auth","phone","password","authBtn","loginTab","registerTab"]},flush=True)
required = ["auth", "phone", "password", "authBtn", "loginTab", "registerTab"]
if not all(x in auth_matches for x in required):
    print("LOGIN_DIAGNOSTICS_BEGIN", flush=True)
    for needle in ['id="phone"','id="password"','id="authBtn"','class="overlay"','class="auth"','class="tabs"']:
        i=html.find(needle)
        print("NODE", needle, "INDEX",i,"CONTEXT", repr(html[max(0,i-350):i+950]) if i>=0 else "",flush=True)
    for pat in [r'id\\s*=\\s*["\\\'](?:phone|password|authBtn|loginTab|registerTab|rotaDriverAuth)["\\\']',r'login|register|auth|giriş',r'<form\\b']:
        ms=list(re.finditer(pat,html,flags=re.I))
        print("PATTERN",pat,"MATCHES",len(ms),flush=True)
        for m in ms[:6]:
            nearby=html[max(0,m.start()-260):min(len(html),m.end()+340)]
            nearby=re.sub(r'(?i)(apikey|token|secret|authorization|password\\s*[:=])[^\\s,;<>]+',r'\\1=[REDACTED]',nearby)
            print(repr(nearby[:630]),flush=True)
    print("LOGIN_DIAGNOSTICS_END",flush=True)
    raise SystemExit("Cannot safely publish: expected final50 login controls were not found.")
style = Path("customer/login-approved.css").read_text(encoding="utf-8")
script = Path("customer/login-approved.js").read_text(encoding="utf-8")
preload = '<style id="rotaCustomerHideBeforeReady">#auth:not(.rotaCustomerApproved){visibility:hidden!important}</style>'
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
