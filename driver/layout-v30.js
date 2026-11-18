/* ROTA Driver v30: visual layout-only patch, keeps all existing trip and login flows unchanged. */
(function(){
  'use strict';
  if (window.__rotaDriverLayout30) return;
  window.__rotaDriverLayout30 = true;
  const style = document.createElement('style');
  style.id = 'rota-layout-30';
  style.textContent = [
    '#r29Trips, #r28Trips {display:block!important;max-height:142px!important;min-height:30px!important;overflow-y:auto!important;overflow-x:hidden!important;overscroll-behavior:contain;-webkit-overflow-scrolling:touch!important;padding:0 3px 2px 0!important;}',
    '#r29Trips .r29-trip, #r28Trips .r28-trip{min-height:51px!important;grid-template-columns:minmax(0,1fr) auto!important;}',
    '#r29Trips .r29-dest, #r28Trips .r28-dest {max-width:100%;white-space:nowrap!important;text-overflow:ellipsis!important;overflow:hidden!important;}',
    '#rotaFinal17 .rfd-card {min-width:0;}',
    '#rotaFinal17 {padding-bottom:104px!important;}',
    '#rotaSupport30 {position:fixed;bottom:calc(14px + env(safe-area-inset-bottom));right:16px;z-index:5500;border:0;border-radius:999px;min-height:48px;display:none;align-items:center;justify-content:center;gap:9px;padding:0 19px;background:#108a50;color:#fff;font:800 15px system-ui,Arial,sans-serif;box-shadow:0 5px 20px rgba(0,0,0,.22)}',
    '#rotaSupport30.is-visible {display:flex!important;}',
    '@media (max-width:520px){#r29Trips,#r28Trips{max-height:116px!important;} #rotaSupport30{bottom:calc(12px + env(safe-area-inset-bottom));right:12px;} }'
  ].join('\n');
  document.head.appendChild(style);
  const support = document.createElement('button');
  support.id = 'rotaSupport30';
  support.type = 'button';
  support.setAttribute('aria-label','ROTA canlı destek');
  support.textContent = '💬 Canlı Destek';
  document.body.appendChild(support);

  function findSupport(){
    const elements = document.querySelectorAll('a, button, [role="button"]');
    for (const el of elements){
      if (el === support || el.closest('#rotaSupport30')) continue;
      const text = (el.innerText || el.textContent || '').trim();
      const href = (el.getAttribute('href') || '').trim();
      if (/canlı\s*destek|whatsapp\s*destek|müşteri\s*hizmetleri/i.test(text) ||
        (/destek/i.test(text) && /wa\.me|whatsapp|api\.whatsapp/i.test(href)) ||
        /^(https?:\/\/)?(wa\.me\/|api\.whatsapp\.com\/|web\.whatsapp\.com\/)/i.test(href)) return el;
    }
    return null;
  }
  function updateSupport(){
    const target = findSupport();
    support.classList.toggle('is-visible', !!target);
  }
  support.onclick = function(){
    const target = findSupport();
    if (!target) return;
    const href = (target.getAttribute('href') || '').trim();
    if (/^https:\/\//i.test(href) || /^https?:\/\//i.test(href)){
      window.open(href, '_blank', 'noopener,noreferrer');
    } else {
      target.click();
    }
  };
  function adjustList(){
    const list = document.getElementById('r29Trips') || document.getElementById('r28Trips');
    if (list && list.parentElement) list.parentElement.style.minWidth='0';
    updateSupport();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',adjustList,{once:true});
  else adjustList();
  const observer=new MutationObserver(()=>{ if(!window.__rotaLayout30Update){window.__rotaLayout30Update=true;requestAnimationFrame(()=>{window.__rotaLayout30Update=false;adjustList();});}});
  observer.observe(document.body,{childList:true,subtree:true});
  window.addEventListener('load',adjustList);
})();
