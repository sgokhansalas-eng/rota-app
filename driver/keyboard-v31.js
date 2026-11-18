/* ROTA Sürücü: mobil 4 haneli yolcu kodu klavye düzeltmesi, yalnızca görünüm. */
(function () {
  'use strict';
  if (window.__rotaPickupKeyboard31) return;
  window.__rotaPickupKeyboard31 = true;

  const css = document.createElement('style');
  css.id = 'rota-pickup-keyboard31';
  css.textContent = `
    #rotaPickupPortal31{display:none;position:fixed!important;left:12px;right:12px;top:10px;z-index:2147483000;
      padding:14px 15px 15px;background:white;color:#10203a;border:1px solid #dce5f2;
      box-shadow:0 8px 35px #071d3d45;border-radius:16px;box-sizing:border-box;font:15px system-ui,Arial,sans-serif}
    #rotaPickupPortal31.open{display:block!important}
    #rotaPickupPortal31 label{display:block;font-weight:800;font-size:15px;margin-bottom:9px}
    #rotaPickupPortal31 .r31-row{display:flex;align-items:center;gap:8px}
    #rotaPickupPortal31 input{min-width:0;flex:1;width:100%;font-size:20px!important;line-height:24px;
      height:48px!important;border:1px solid #bbc8d9;border-radius:10px;padding:8px 12px;color:#10203a;
      background:#fff;box-sizing:border-box}
    #rotaPickupPortal31 button{border:0;border-radius:10px;padding:0 12px;min-height:48px;font-weight:800;
      font-size:14px;color:white;background:#c70a16;white-space:nowrap}
    #rotaPickupPortal31 button.r31-close{background:#e8edf4;color:#24344c;min-width:38px;padding:0 8px}
    #rotaPickupPortal31 .r31-note{font-size:11px;color:#687990;margin-top:9px}
    @media(max-width:380px){#rotaPickupPortal31{left:8px;right:8px;padding:11px}
      #rotaPickupPortal31 button{padding:0 8px;font-size:12px}}
  `;
  document.head.appendChild(css);
  const modal = document.createElement('section');
  modal.id = 'rotaPickupPortal31';
  modal.setAttribute('aria-label', 'Yolcu kodunu gir');
  modal.innerHTML = '<label for="r31code">Yolcu kodu doğrulama</label><div class="r31-row">'+
    '<input id="r31code" inputmode="numeric" type="text" maxlength="4" autocomplete="one-time-code" pattern="[0-9]{4}" placeholder="4 haneli kod" />'+
    '<button type="button" id="r31verify">Doğrula</button><button type="button" class="r31-close" id="r31close" aria-label="Kapat">✕</button></div>'+
    '<div class="r31-note">Kodu girdikten sonra Doğrula butonuna basın.</div>';
  document.body.appendChild(modal);
  const code = modal.querySelector('#r31code');
  const ok = modal.querySelector('#r31verify');
  const close = modal.querySelector('#r31close');
  let source = null, button = null;
  const isCode = input => input instanceof HTMLInputElement &&
    !modal.contains(input) && (
      /4\s*haneli\s*kod|yolcu\s*kodu/i.test(input.placeholder || '') ||
      (/code|pickup/i.test(input.id || '') && String(input.maxLength) === '4')
    );

  function position() {
    if (!modal.classList.contains('open')) return;
    const vv = window.visualViewport;
    const offset = vv ? vv.offsetTop : 0;
    const height = vv ? vv.height : window.innerHeight;
    const size = modal.getBoundingClientRect().height || 155;
    // Align the input box to the visible part of the screen, above the soft keyboard.
    modal.style.top = Math.max(offset + 6, offset + height - size - 10) + 'px';
  }
  function hide(restore) {
    modal.classList.remove('open');
    if (restore && source) {
      try { source.focus({preventScroll:true}) } catch(e){}
    }
    source = null;button = null;
  }
  function findVerify(input) {
    let node = input.parentElement;
    for (let depth=0; node && depth<5; depth++,node=node.parentElement) {
      const b = [...node.querySelectorAll('button')].find(btn => /^doğrula$/i.test((btn.textContent||'').trim()));
      if (b) return b;
    }
    return null;
  }
  function open(input) {
    const verify = findVerify(input);
    if (!verify) return; // Never interfere with other code or login fields.
    source = input;button = verify;
    code.value = String(source.value || '').replace(/\D/g,'').slice(0,4);
    modal.classList.add('open');
    position();
    setTimeout(() => {code.focus({preventScroll:true});position();}, 60);
    setTimeout(position, 260);
    setTimeout(position, 520);
  }
  function submit() {
    if (!source || !button) return hide(false);
    const value = code.value.replace(/\D/g,'').slice(0,4);
    if (value.length !== 4) {code.setCustomValidity('4 haneli kod girin');code.reportValidity();return}
    code.setCustomValidity('');
    const input = source, verify = button;
    input.value = value;
    input.dispatchEvent(new Event('input',{bubbles:true}));
    input.dispatchEvent(new Event('change',{bubbles:true}));
    hide(false);
    code.blur();
    verify.click();
  }
  document.addEventListener('focusin', e => {
    if (isCode(e.target)) open(e.target);
  }, true);
  code.addEventListener('input', () => {
    code.value = code.value.replace(/\D/g,'').slice(0,4);
    code.setCustomValidity('');
  });
  code.addEventListener('keydown', e => {if(e.key==='Enter'){e.preventDefault();submit()}});
  ok.addEventListener('click',submit);
  close.addEventListener('click', () => {code.blur();hide(false)});
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize',position,{passive:true});
    window.visualViewport.addEventListener('scroll',position,{passive:true});
  }
  window.addEventListener('resize',position,{passive:true});
})();
