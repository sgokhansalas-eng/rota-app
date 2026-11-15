
const upstream = "https://rota-surucu-final15.onrender.com";
function inject(html:string){
  const css = `<style>
#rotaForgotBtn{width:100%;margin-top:10px;border:0;background:transparent;color:#0b4aa2;font-size:14px;font-weight:800;padding:10px}
#rotaResetBack{display:none;position:fixed;inset:0;background:rgba(5,15,35,.58);z-index:2147483600;align-items:center;justify-content:center;padding:18px}
#rotaResetBox{width:min(420px,100%);background:#fff;border-radius:22px;padding:20px;color:#0f172a;box-shadow:0 20px 60px rgba(0,0,0,.35)}
#rotaResetBox h3{margin:0 0 6px;font-size:22px}#rotaResetBox p{margin:0 0 14px;color:#64748b;font-size:13px;line-height:1.45}
#rotaResetBox input{width:100%;box-sizing:border-box;margin:7px 0;padding:14px;border:1px solid #dbe3ee;border-radius:13px;font-size:16px}
#rotaResetBox button{width:100%;border:0;border-radius:13px;padding:14px;font-weight:900;margin-top:9px}
#rotaResetSend,#rotaResetConfirm{background:#f6be35;color:#081329}#rotaResetClose{background:#eef2f7;color:#334155}
#rotaResetMsg{font-size:13px;margin-top:10px;min-height:18px;color:#b91c1c}
</style>`;
  const js = `<script>
(function(){
 const role='driver', CORE_RESET='https://ftltemgtzkjfnkxsxxmd.supabase.co/functions/v1/rota2-core', KEY_RESET='sb_publishable_2d5xkUbWQECxv8jyaq2-Bg_sc-Qo8cr';
 function by(i){return document.getElementById(i)}
 function dig(v){return String(v||'').replace(/\\D/g,'').replace(/^90/,'').replace(/^0/,'').slice(-10)}
 async function api(action,body){const r=await fetch(CORE_RESET+'?action='+action,{method:'POST',headers:{'Content-Type':'application/json','apikey':KEY_RESET},body:JSON.stringify(body||{})});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||'İşlem başarısız');return j}
 function install(){
  const pass=document.querySelector('input[type="password"]'); if(!pass||by('rotaForgotBtn'))return;
  const btn=by('authBtn')||pass.parentElement.querySelector('button'); if(!btn)return;
  const f=document.createElement('button'); f.id='rotaForgotBtn'; f.type='button'; f.textContent='Şifremi Unuttum'; btn.insertAdjacentElement('afterend',f);
  const back=document.createElement('div'); back.id='rotaResetBack'; back.innerHTML='<div id="rotaResetBox"><h3>Şifremi Unuttum</h3><p>Telefonunuza gelen 6 haneli doğrulama koduyla yeni şifre belirleyin.</p><input id="rotaResetPhone" type="tel" placeholder="Telefon numarası"><button id="rotaResetSend">SMS Kodu Gönder</button><div id="rotaResetStep2" style="display:none"><input id="rotaResetCode" inputmode="numeric" maxlength="6" placeholder="6 haneli kod"><input id="rotaResetPass" type="password" minlength="6" placeholder="Yeni şifre (en az 6 karakter)"><button id="rotaResetConfirm">Yeni Şifreyi Kaydet</button></div><div id="rotaResetMsg"></div><button id="rotaResetClose">Kapat</button></div>'; document.body.appendChild(back);
  f.onclick=()=>{const ph=by('phone')||document.querySelector('input[type="tel"]');by('rotaResetPhone').value=ph?ph.value:'';back.style.display='flex';by('rotaResetMsg').textContent=''};
  by('rotaResetClose').onclick=()=>back.style.display='none';
  by('rotaResetSend').onclick=async function(){const phone=dig(by('rotaResetPhone').value),msg=by('rotaResetMsg');msg.style.color='#b91c1c';if(phone.length!==10){msg.textContent='Geçerli telefon numarası girin.';return}this.disabled=true;try{await api('password-reset-start',{role,phone});by('rotaResetStep2').style.display='block';msg.style.color='#047857';msg.textContent='SMS kodu gönderildi. Kodunuzu ve yeni şifrenizi girin.'}catch(e){msg.textContent=e.message}finally{this.disabled=false}};
  by('rotaResetConfirm').onclick=async function(){const phone=dig(by('rotaResetPhone').value),code=String(by('rotaResetCode').value||'').replace(/\\D/g,''),np=String(by('rotaResetPass').value||''),msg=by('rotaResetMsg');msg.style.color='#b91c1c';if(code.length!==6){msg.textContent='6 haneli SMS kodunu girin.';return}if(np.length<6){msg.textContent='Yeni şifre en az 6 karakter olmalı.';return}this.disabled=true;try{await api('password-reset-confirm',{role,phone,code,newPassword:np});msg.style.color='#047857';msg.textContent='Şifreniz değiştirildi. Yeni şifrenizle giriş yapabilirsiniz.';setTimeout(()=>back.style.display='none',1200)}catch(e){msg.textContent=e.message}finally{this.disabled=false}};
 }
 window.addEventListener('load',()=>{setTimeout(install,400);setTimeout(install,1400)});
})();
</script>`;
  html = html.replace("<head>", "<head><base href=\""+upstream+"/\">");
  html = html.replace("</head>", css+"</head>");
  html = html.replace("</body>", js+"</body>");
  return html;
}
Deno.serve(async (req)=>{
  const u=new URL(req.url);
  const marker="/rota-driver-app";
  if(u.pathname.endsWith(marker) || u.pathname.endsWith(marker+"/")){
    const r=await fetch(upstream+"/");
    const html=await r.text();
    return new Response(inject(html),{headers:{"content-type":"text/html; charset=utf-8","cache-control":"no-store"}});
  }
  const idx=u.pathname.indexOf(marker+"/");
  const path=idx>=0?u.pathname.slice(idx+marker.length+1):"";
  const r=await fetch(upstream+"/"+path+u.search);
  return new Response(r.body,{status:r.status,headers:r.headers});
});