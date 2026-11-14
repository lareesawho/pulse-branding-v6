/* Pulse — six homepage variants via IN-PLACE RESTYLING of the template's real elements.
   No overlays, no node swapping: the existing Bar / Links / Tab / Right-CTA and the two real
   hero <a> elements are re-skinned; decoration uses their own pseudo-elements. A few CSS vars
   drive the eye tracking. React keeps ownership of every node, so nothing can be reverted. */
(function () {
  'use strict';
  var V = new URLSearchParams(location.search).get('v');
  if (!V || !/^[1-6]$/.test(V)) return;

  var NAV = '[data-framer-name="Navigation"] ';
  var BAR = NAV + '[data-framer-name="Bar"]';
  var LOGO = NAV + '[data-framer-name="Logo Wrap"]';
  var LINKS = NAV + '[data-framer-name="Links"]';
  var TAB = LINKS + ' [data-framer-name="Tab"]';
  var RIGHT = NAV + '[data-framer-name="Right"] a';
  var CTA1 = '[data-framer-name="Hero CTAs"] > div:nth-child(1) a';
  var CTA2 = '[data-framer-name="Hero CTAs"] > div:nth-child(2) a';

  var css = '';

  /* shared: let the bar host pseudo-element decoration */
  css += BAR + '{position:relative!important}' +
         BAR + '>div{position:relative;z-index:1}' +
         '.pv-logo, [data-framer-name="Logo Wrap"] a{position:relative!important}[data-framer-name="Logo Wrap"] a > *{display:none!important}[data-framer-name="Logo Wrap"] a::after{content:"PULSE";position:relative!important;visibility:visible!important;display:inline-block;font:600 15px/1 "Pulse Display","Pulse Body",sans-serif;letter-spacing:.16em;color:var(--pv-logo,#fff)}[data-framer-name="Links"] a{background:transparent!important;border-radius:8px!important;transition:background-color .3s ease,color .3s ease}[data-framer-name="Links"] a[data-framer-page-link-current]{border-radius:8px!important}[data-framer-name="Links"] [data-framer-name="Tab"] > *{background-color:transparent!important;border-color:transparent!important}[data-framer-name="Links"] > *{background-color:transparent!important}[data-framer-name="Links"]{border-width:0!important;--border-top-width:0px!important;--border-bottom-width:0px!important;--border-left-width:0px!important;--border-right-width:0px!important}[data-framer-name="Links"]::after,[data-framer-name="Links"]::before{display:none!important}body[data-pv="4"] [data-framer-name="Hero CTAs"] > div:nth-child(1) a > div{position:relative!important;z-index:2!important}body[data-pv="4"] [data-framer-name="Hero CTAs"] > div:nth-child(1) a::after{z-index:1!important}body[data-pv="4"] [data-framer-name="Hero CTAs"] > div:nth-child(1) a [data-framer-name="Label Roll"]{position:relative!important;z-index:2!important}body[data-pv="5"] [data-framer-name="Hero CTAs"] > div:nth-child(1) a > div{position:relative!important;z-index:2!important}body[data-pv="5"] [data-framer-name="Hero CTAs"] > div:nth-child(1) a [data-framer-name="Dot"]{display:none!important}body[data-pv="5"] [data-framer-name="Hero CTAs"] > div:nth-child(1) a [data-framer-name="Label Roll"]{white-space:nowrap!important;position:relative!important;z-index:2!important}body[data-pv="6"] [data-framer-name="Hero CTAs"] > div:nth-child(1) a,body[data-pv="6"] [data-framer-name="Hero CTAs"] > div:nth-child(2) a{color:#eef4f7!important}body[data-pv="6"] [data-framer-name="Hero CTAs"] > div:nth-child(1) a [data-framer-name="Dot"],body[data-pv="6"] [data-framer-name="Hero CTAs"] > div:nth-child(2) a [data-framer-name="Dot"]{display:none!important}.pv-note{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:9999;display:flex;gap:8px;align-items:center;' +
         'padding:8px 12px;border-radius:999px;background:rgba(12,14,16,.86);border:1px solid rgba(214,234,240,.16);backdrop-filter:blur(10px);' +
         'font:500 10px/1 "Pulse Body",sans-serif;letter-spacing:.12em;text-transform:uppercase;color:rgba(214,234,240,.8)}' +
         '.pv-note a{color:#fff;text-decoration:none;border-bottom:1px solid rgba(255,255,255,.3)}';

  /* ---------------------------------------------------------------- F1 glass */
  css += 'body[data-pv="1"] [data-framer-name="Links"] a{color:#0b0b0c!important}[data-framer-name="Links"] a[data-framer-page-link-current]{background:rgba(11,11,12,.10)!important}';
  css += 'body[data-pv="1"]{--pv-logo:#0b0b0c}' + 'body[data-pv="1"] ' + BAR + '{background:transparent!important;border:none!important;margin:14px 24px!important;height:64px!important;border-radius:999px!important;padding:0 22px!important;backdrop-filter:none!important}' +
         'body[data-pv="1"] ' + BAR + '::before{content:"";position:absolute;inset:0;border-radius:999px;z-index:0;pointer-events:none;' +
         'background:linear-gradient(180deg,rgba(255,255,255,.30),rgba(255,255,255,.12) 46%,rgba(255,255,255,.20));' +
         'backdrop-filter:blur(22px) saturate(170%) brightness(1.18);-webkit-backdrop-filter:blur(22px) saturate(170%) brightness(1.18);' +
         'box-shadow:inset 0 1px 0 rgba(255,255,255,.85),inset 0 -1px 0 rgba(255,255,255,.45),inset 0 0 30px rgba(255,255,255,.14),0 22px 50px -30px rgba(0,0,0,.75)}' +
         'body[data-pv="1"] ' + LOGO + ' *{color:#0b0b0c!important}' +
         'body[data-pv="1"] ' + LINKS + '{background:transparent!important;border:none!important;border-radius:0!important}' +
         'body[data-pv="1"] ' + TAB + '{background:transparent!important;border-radius:8px!important}' +
         'body[data-pv="1"] ' + TAB + ' *{color:#0b0b0c!important}' +
         'body[data-pv="1"] ' + RIGHT + '{background:#0b0b0c!important;color:#fff!important;border-radius:999px!important;height:40px!important;padding:0 20px!important}' +
         'body[data-pv="1"] ' + RIGHT + ' *{color:#fff!important}';

  /* --------------------------------------------------------------- F2 modern */
  css += 'body[data-pv="2"] [data-framer-name="Links"] a{color:rgba(255,255,255,.82)!important}[data-framer-name="Links"] a[data-framer-page-link-current]{background:rgba(255,255,255,.16)!important;color:#fff!important}';
  css += 'body[data-pv="2"]{--pv-logo:#ffffff}' + 'body[data-pv="2"] ' + BAR + '{background:#000!important;border-radius:999px!important;margin:10px 24px!important;height:67px!important;padding:0 18px!important;border:none!important;box-shadow:0 14px 40px -30px rgba(0,0,0,.9)}' +
         'body[data-pv="2"] ' + LOGO + ' *{color:#fff!important}' +
         'body[data-pv="2"] ' + LINKS + '{background:rgba(255,255,255,.08)!important;border:none!important;border-radius:999px!important;padding:6px 8px!important}' +
         'body[data-pv="2"] ' + TAB + '{background:transparent!important;border-radius:18px!important;height:36px!important;padding:0 16px!important;transition:background .3s ease}' +
         'body[data-pv="2"] ' + TAB + ':hover{background:rgba(255,255,255,.12)!important}' +
         'body[data-pv="2"] ' + TAB + ' *{color:rgba(255,255,255,.82)!important}' +
         'body[data-pv="2"] ' + RIGHT + '{background:#fff!important;border-radius:999px!important;height:44px!important;padding:0 22px!important}' +
         'body[data-pv="2"] ' + RIGHT + ' *{color:#000!important}';

  /* ------------------------------------------------------- F3 liquid glass */
  css += 'body[data-pv="3"] [data-framer-name="Links"] a{color:#5a5f66!important}[data-framer-name="Links"] a[data-framer-page-link-current]{background:rgba(17,17,19,.07)!important;color:#111!important}';
  css += 'body[data-pv="3"]{--pv-logo:#111111}' + 'body[data-pv="3"] ' + BAR + '{background:transparent!important;border:none!important;margin:12px 24px!important;height:58px!important;border-radius:999px!important;padding:0 14px!important;backdrop-filter:none!important}' +
         'body[data-pv="3"] ' + BAR + '::before{content:"";position:absolute;inset:0;border-radius:999px;z-index:0;pointer-events:none;' +
         'background:linear-gradient(180deg,#ffffff 0%,#c9c9c9 9%,#a1a1a1 32%,#757575 73%,#ffffff 100%);' +
         'box-shadow:0 1px 2px rgba(0,0,0,.18),0 10px 30px -18px rgba(0,0,0,.35)}' +
         'body[data-pv="3"] ' + BAR + '::after{content:"";position:absolute;inset:3px;border-radius:999px;z-index:0;pointer-events:none;' +
         'background:linear-gradient(180deg,rgba(255,255,255,.94),rgba(238,240,242,.9));backdrop-filter:blur(10px)}' +
         'body[data-pv="3"] ' + LOGO + ' *{color:#111!important}' +
         'body[data-pv="3"] ' + LINKS + '{background:transparent!important;border:none!important;border-radius:0!important}' +
         'body[data-pv="3"] ' + TAB + '{background:transparent!important;border-radius:8px!important}' +
         'body[data-pv="3"] ' + TAB + ' *{color:#5a5f66!important}' +
         'body[data-pv="3"] ' + RIGHT + '{background:#0b0b0c!important;border-radius:999px!important;height:44px!important;padding:0 22px!important}' +
         'body[data-pv="3"] ' + RIGHT + ' *{color:#fff!important}';

  /* ---------------------------------------------------------- F4 pixel button */
  css += 'body[data-pv="4"] ' + CTA1 + '{position:relative!important;overflow:hidden!important;background:#000!important;' +
         'border:1px solid rgba(255,255,255,.14)!important;border-radius:360px!important;height:58px!important;padding:0 34px!important}' +
         'body[data-pv="4"] ' + CTA1 + '::after{content:"";position:absolute;inset:0;border-radius:inherit;opacity:0;transition:opacity .35s ease;pointer-events:none;' +
         'background-image:radial-gradient(#00ff44 1.4px,transparent 1.6px);background-size:7px 7px;animation:pv-pix 1.8s linear infinite}' +
         'body[data-pv="4"] ' + CTA1 + ':hover::after{opacity:.9}' +
         'body[data-pv="4"] ' + CTA1 + ' *{color:#fff!important}' +
         'body[data-pv="4"] ' + CTA1 + ' [data-framer-name="Dot"]{background:#00ff44!important}' +
         'body[data-pv="4"] ' + CTA2 + '{background:transparent!important;border:1px solid rgba(214,234,240,.22)!important;border-radius:360px!important;height:58px!important;padding:0 26px!important}' +
         '@keyframes pv-pix{to{background-position:7px 7px}}';

  /* ------------------------------------------------------------ F5 eye button */
  css += 'body[data-pv="5"] ' + CTA1 + '{position:relative!important;background:#000!important;border:none!important;border-radius:30px!important;' +
         'height:47px!important;padding:6px 104px 6px 20px!important;overflow:visible!important;box-shadow:0 1px 2px rgba(0,0,0,.2),0 4px 10px -6px rgba(0,0,0,.35)}' +
         'body[data-pv="5"] ' + CTA1 + ' *{color:#fff!important}' +
         'body[data-pv="5"] ' + CTA1 + '::before,body[data-pv="5"] ' + CTA1 + '::after{content:"";position:absolute;top:50%;width:35px;height:35px;border-radius:50%;' +
         'transform:translateY(-50%);pointer-events:none;' +
         'background:radial-gradient(circle at calc(50% + var(--ex,0px)) calc(50% + var(--ey,0px)),#000 0 6.5px,#fff 7px)}' +
         'body[data-pv="5"] ' + CTA1 + '::before{right:57px}' +
         'body[data-pv="5"] ' + CTA1 + '::after{right:15px}' +
         'body[data-pv="5"] ' + CTA2 + '{background:transparent!important;border:1px solid rgba(214,234,240,.22)!important;border-radius:30px!important;height:47px!important;padding:0 22px!important}';

  /* --------------------------------------------------------- F6 editorial set */
  css += 'body[data-pv="6"] ' + CTA1 + '::before{content:""}' +
         'body[data-pv="6"] ' + CTA1 + ',body[data-pv="6"] ' + CTA2 + '{background:transparent!important;border:none!important;' +
         'padding:10px 0 12px!important;height:auto!important;border-radius:0!important;position:relative!important}' +
         'body[data-pv="6"] ' + CTA1 + ' *,body[data-pv="6"] ' + CTA2 + ' *{color:#eef4f7!important}' +
         'body[data-pv="6"] ' + CTA1 + '::after{content:"\\2192";margin-left:8px;display:inline-block;transition:transform .35s cubic-bezier(.22,1,.36,1)}' +
         'body[data-pv="6"] ' + CTA1 + ':hover::after{transform:translateX(5px)}' +
         'body[data-pv="6"] ' + CTA2 + '{border:1px solid rgba(238,244,247,.5)!important;border-radius:999px!important;height:44px!important;padding:0 24px!important}' +
         'body[data-pv="6"] ' + CTA2 + ':hover{background:rgba(238,244,247,.1)!important}' +
         'body[data-pv="6"] [data-framer-name="Hero CTAs"] [data-framer-name="Dot"]{display:none!important}';

  function apply() {
    if (!document.body) return false;
    document.body.setAttribute('data-pv', V);
    if (!document.getElementById('pv-styles')) {
      var st = document.createElement('style');
      st.id = 'pv-styles';
      st.textContent = css;
      document.head.appendChild(st);
    }
    if (!document.querySelector('.pv-note')) {
      var note = document.createElement('div');
      note.className = 'pv-note';
      note.innerHTML = 'Variant ' + V + ' &middot; <a href="/custom/variants.html">all six</a>';
      document.body.appendChild(note);
    }
    return true;
  }

  if (!apply()) document.addEventListener('DOMContentLoaded', apply);

  /* F5 needs the pupils to follow the cursor: two offsets from the button centre */
  if (V === '5') {
    document.addEventListener('pointermove', function (e) {
      var btn = document.querySelector('[data-framer-name="Hero CTAs"] > div:nth-child(1) a');
      if (!btn) return;
      var r = btn.getBoundingClientRect();
      var dx = e.clientX - (r.left + r.width / 2);
      var dy = e.clientY - (r.top + r.height / 2);
      var d = Math.hypot(dx, dy) || 1;
      var max = 7;
      btn.style.setProperty('--ex', (dx / d * max).toFixed(1) + 'px');
      btn.style.setProperty('--ey', (dy / d * max).toFixed(1) + 'px');
    });
  }
})();
