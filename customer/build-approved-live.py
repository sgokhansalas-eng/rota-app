#!/usr/bin/env python3
"""Create an isolated ROTA Customer visual release from the existing working customer dashboard."""
from pathlib import Path
from urllib.request import urlopen, Request

source = "https://rota-musteri-final50.onrender.com/"
out = Path("customer-approved-public")
out.mkdir(exist_ok=True)
request = Request(source, headers={"User-Agent":"ROTA-Customer-Login-Release/1.0","Cache-Control":"no-cache"})
with urlopen(request, timeout=110) as response:
    html = response.read().decode("utf-8")
markers = ["id=\"auth\"", "id=\"phone\"", "id=\"password\"", "id=\"authBtn\"", "id=\"loginTab\"", "id=\"registerTab\""]
if not all(marker in html for marker in markers):
    raise SystemExit("Required existing auth controls missing; refusing to publish.")
if "</head>" not in html or "</body>" not in html:
    raise SystemExit("Unexpected source HTML; refusing to publish.")
style = Path("customer/login-approved.css").read_text(encoding="utf-8")
script = Path("customer/login-approved.js").read_text(encoding="utf-8")
# Prevent the original UI appearing momentarily before the styling is initialized.
preload = '<style id="rotaCustomerHideBeforeReady">#auth:not(.rotaCustomerApproved){visibility:hidden!important}</style>'
html = html.replace("</head>", preload + "\n<style>" + style + "</style>\n</head>", 1)
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
html = html.replace("</body>", fallback + "\n</body>", 1)
(out / "index.html").write_text(html, encoding="utf-8")
print("Customer visual login release ready; original auth and dashboard copied unchanged")
