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
(out / "index.html").write_text(html, encoding="utf-8")
for name in ["login-gold-v38.js", "login-password-align-v40.js"]:
    shutil.copyfile(Path("driver") / name, out / name)
print("ROTA Driver entry built from final29, login initialized before first render")
