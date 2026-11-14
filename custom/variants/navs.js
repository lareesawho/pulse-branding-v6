/* Pulse — nav options (?nav=1..4), applied to the real header by restyling its own elements.
   Measurements taken from the sources:
     F1 refractive: 1224×64 pill, CTA 108×37 r999 #111, links 14–17 px
     F2 modern:     1392×67 pill r46, padding 12/24, CTA 114×35 r18 #fff
     F3 liquid:     800×58 pill, 3 px rim, CTA 127×36 gradient #26262a→#08080a + inset highlight
   The hero keeps the eye-follow button (the one you picked). */
(function () {
  'use strict';
  var m = location.search.match(/[?&]nav=([1-4])/);
  if (!m) return;
  var N = m[1];

  var NAV = '[data-framer-name="Navigation"] ';
  var BAR = NAV + '[data-framer-name="Bar"]';
  var LOGO = NAV + '[data-framer-name="Logo Wrap"]';
  var LINKS = NAV + '[data-framer-name="Links"]';
  var TAB = LINKS + ' [data-framer-name="Tab"]';
  var RIGHT = NAV + '[data-framer-name="Right"] a';
  var CTA1 = '[data-framer-name="Hero CTAs"] > div:nth-child(1) a';
  var CTA2 = '[data-framer-name="Hero CTAs"] > div:nth-child(2) a';

  var css = '';

  /* ---------------------------------------------------------------- base reset */
  css += BAR + '{position:relative!important;overflow:visible!important}' +
         BAR + '>div{position:relative;z-index:2}' +
         LOGO + ' a{position:relative!important}' +
         LOGO + ' a>*{display:none!important}' +
         LOGO + ' a::after{content:"PULSE";position:relative!important;display:inline-block;' +
         'font:600 15px/1 "Pulse Display","Pulse Body",sans-serif;letter-spacing:.16em}' +
         LINKS + '{border-width:0!important;--border-top-width:0px!important;--border-bottom-width:0px!important;' +
         '--border-left-width:0px!important;--border-right-width:0px!important;background:transparent!important}' +
         LINKS + '::after,' + LINKS + '::before{display:none!important}' +
         LINKS + ' a{background:transparent!important;border-radius:9px!important;transition:background-color .28s ease,color .28s ease,opacity .28s ease}' +
         TAB + '{background:transparent!important;border-radius:9px!important;box-shadow:none!important}' +
         TAB + '>*{background-color:transparent!important;border-color:transparent!important}';

  /* eye-follow button (kept from the chosen direction) */
  css += 'body[data-nav] ' + CTA1 + '{position:relative!important;background:#000!important;border:none!important;border-radius:30px!important;' +
         'height:47px!important;padding:6px 104px 6px 20px!important;overflow:visible!important;' +
         'box-shadow:0 1px 2px rgba(0,0,0,.2),0 4px 10px -6px rgba(0,0,0,.35)}' +
         'body[data-nav] ' + CTA1 + ' *{color:#fff!important}' +
         'body[data-nav] ' + CTA1 + ' [data-framer-name="Dot"]{display:none!important}' +
         'body[data-nav] ' + CTA1 + ' [data-framer-name="Label Roll"]{white-space:nowrap!important;position:relative!important;z-index:2!important}' +
         'body[data-nav] ' + CTA1 + '::before,body[data-nav] ' + CTA1 + '::after{content:"";position:absolute;top:50%;width:35px;height:35px;border-radius:50%;' +
         'transform:translateY(-50%);pointer-events:none;' +
         'background:radial-gradient(circle at calc(50% + var(--ex,0px)) calc(50% + var(--ey,0px)),#000 0 6.5px,#fff 7px)}' +
         'body[data-nav] ' + CTA1 + '::before{right:57px}' +
         'body[data-nav] ' + CTA1 + '::after{right:15px}' +
         'body[data-nav] ' + CTA2 + '{background:transparent!important;border:1px solid rgba(214,234,240,.22)!important;border-radius:30px!important;height:47px!important;padding:0 22px!important}' +
         '.pv-note{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:9999;display:flex;gap:8px;align-items:center;' +
         'padding:8px 12px;border-radius:999px;background:rgba(12,14,16,.86);border:1px solid rgba(214,234,240,.16);backdrop-filter:blur(10px);' +
         'font:500 10px/1 "Pulse Body",sans-serif;letter-spacing:.12em;text-transform:uppercase;color:rgba(214,234,240,.8)}' +
         '.pv-note a{color:#fff;text-decoration:none;border-bottom:1px solid rgba(255,255,255,.3)}';

  /* ------------------------------------------------- 1 · refractive glass, improved
     1224×64, dark text, #111 CTA, layered optics: tint + rim + specular streak + lens bands + noise */
  css += 'body[data-nav="1"] ' + BAR + '{width:min(1224px,calc(100vw - 48px))!important;height:64px!important;margin:14px auto!important;padding:0 22px!important;' +
         'border-radius:999px!important;background:linear-gradient(180deg,rgba(219,238,244,.28),rgba(214,234,240,.10) 52%,rgba(203,228,238,.18))!important;' +
         'backdrop-filter:blur(22px) saturate(180%) brightness(1.12)!important;-webkit-backdrop-filter:blur(22px) saturate(180%) brightness(1.12)!important;' +
         'box-shadow:inset 0 1px 0 rgba(255,255,255,.8),inset 0 -1px 0 rgba(255,255,255,.36),inset 0 0 0 1px rgba(255,255,255,.14),' +
         'inset 0 24px 44px -26px rgba(255,255,255,.4),inset 0 -26px 44px -30px rgba(0,0,0,.6),0 26px 60px -32px rgba(0,0,0,.85)!important}' +
         'body[data-nav="1"] ' + BAR + '::before{content:"";position:absolute;inset:0;border-radius:999px;pointer-events:none;z-index:1;' +
         'background:linear-gradient(112deg,transparent 34%,rgba(255,255,255,.16) 47%,rgba(255,255,255,.04) 55%,transparent 66%);mix-blend-mode:screen;opacity:.85}' +
         'body[data-nav="1"] ' + BAR + '::after{content:"";position:absolute;inset:0;border-radius:999px;pointer-events:none;z-index:1;' +
         'background:radial-gradient(120% 70% at 50% -20%,rgba(255,255,255,.5),transparent 46%),radial-gradient(120% 70% at 50% 120%,rgba(214,234,240,.25),transparent 50%);' +
         'mix-blend-mode:screen}' +
         'body[data-nav="1"] ' + LOGO + ' a::after{color:#0b0b0c}' +
         'body[data-nav="1"] ' + LINKS + ' a{color:rgba(11,11,12,.72)!important;font-size:14px!important;font-weight:500!important;letter-spacing:.01em!important;padding:8px 12px!important}' +
         'body[data-nav="1"] ' + LINKS + ' a:hover{color:#0b0b0c!important;background:rgba(11,11,12,.06)!important}' +
         'body[data-nav="1"] ' + LINKS + ' a[data-framer-page-link-current]{color:#0b0b0c!important;background:rgba(11,11,12,.08)!important;' +
         'box-shadow:inset 0 0 0 1px rgba(11,11,12,.10)}' +
         'body[data-nav="1"] ' + RIGHT + '{height:37px!important;padding:0 18px!important;border-radius:999px!important;background:#111!important;' +
         'box-shadow:inset 0 1px 0 rgba(255,255,255,.18)}' +
         'body[data-nav="1"] ' + RIGHT + ' *{color:#fff!important}' +
         'body[data-nav="1"] ' + RIGHT + ':hover{background:#000!important}';

  /* --------------------------------------------------------- 2 · modern navbar
     1392×67, radius 46, padding 12/24, #000, CTA 114×35 r18 #fff */
  css += 'body[data-nav="2"] ' + BAR + '{width:min(1392px,calc(100vw - 48px))!important;height:67px!important;margin:10px auto!important;padding:12px 24px!important;' +
         'border-radius:46px!important;background:#000!important;box-shadow:0 18px 44px -34px rgba(0,0,0,.95)!important}' +
         'body[data-nav="2"] ' + LOGO + ' a::after{color:#fff}' +
         'body[data-nav="2"] ' + LINKS + ' a{color:rgba(255,255,255,.72)!important;font-size:14px!important;font-weight:500!important;letter-spacing:.01em!important;' +
         'height:36px!important;padding:0 16px!important;border-radius:18px!important}' +
         'body[data-nav="2"] ' + LINKS + ' a:hover{color:#fff!important;background:rgba(255,255,255,.1)!important}' +
         'body[data-nav="2"] ' + LINKS + ' a[data-framer-page-link-current]{color:#fff!important;background:rgba(255,255,255,.12)!important}' +
         'body[data-nav="2"] ' + RIGHT + '{height:35px!important;padding:0 16px!important;border-radius:18px!important;background:#fff!important}' +
         'body[data-nav="2"] ' + RIGHT + ' *{color:#000!important}' +
         'body[data-nav="2"] ' + RIGHT + ':hover{background:#e9eaec!important}';

  /* ------------------------------------------------------- 3 · liquid glass navbar
     800×58, 3 px gradient rim, light glass body, gradient CTA */
  css += 'body[data-nav="3"] ' + BAR + '{width:min(880px,calc(100vw - 48px))!important;height:58px!important;margin:12px auto!important;padding:3px!important;' +
         'border-radius:999px!important;background:linear-gradient(180deg,#fff 0%,#c9c9c9 9%,#a1a1a1 32%,#757575 73%,#fff 100%)!important;' +
         'box-shadow:0 1px 2px rgba(0,0,0,.18),0 12px 34px -20px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.9)!important}' +
         'body[data-nav="3"] ' + BAR + '::before{content:"";position:absolute;inset:3px;border-radius:999px;pointer-events:none;z-index:1;' +
         'background:linear-gradient(180deg,rgba(255,255,255,.96),rgba(238,240,242,.9));backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);' +
         'box-shadow:inset 0 1px 0 rgba(255,255,255,1),inset 0 -1px 0 rgba(0,0,0,.06)}' +
         'body[data-nav="3"] ' + LOGO + '{margin-left:14px!important}' +
         'body[data-nav="3"] ' + LOGO + ' a::after{color:#111}' +
         'body[data-nav="3"] ' + LINKS + ' a{color:#5a5f66!important;font-size:14px!important;font-weight:500!important;padding:8px 14px!important;border-radius:999px!important}' +
         'body[data-nav="3"] ' + LINKS + ' a:hover{color:#111!important;background:rgba(17,17,19,.06)!important}' +
         'body[data-nav="3"] ' + LINKS + ' a[data-framer-page-link-current]{color:#111!important;background:rgba(17,17,19,.08)!important}' +
         'body[data-nav="3"] ' + RIGHT + '{height:36px!important;padding:0 16px!important;border-radius:999px!important;' +
         'background:linear-gradient(180deg,#26262a 0%,#08080a 100%)!important;' +
         'box-shadow:inset 0 1px 0 rgba(255,255,255,.28),0 6px 16px -10px rgba(0,0,0,.7)!important}' +
         'body[data-nav="3"] ' + RIGHT + ' *{color:#fff!important}';

  /* ------------------------------------------------------------ 4 · Pulse native
     floating ice-hairline pill, gradient underglow on hover, aqua active rule */
  css += 'body[data-nav="4"] ' + BAR + '{width:min(1180px,calc(100vw - 48px))!important;height:62px!important;margin:14px auto!important;padding:0 18px!important;' +
         'border-radius:999px!important;background:rgba(9,10,12,.72)!important;backdrop-filter:blur(18px) saturate(140%)!important;-webkit-backdrop-filter:blur(18px) saturate(140%)!important;' +
         'box-shadow:inset 0 0 0 1px rgba(214,234,240,.10),inset 0 1px 0 rgba(214,234,240,.16),0 24px 60px -36px rgba(0,0,0,.9)!important}' +
         'body[data-nav="4"] ' + BAR + '::before{content:"";position:absolute;inset:-1px;border-radius:999px;padding:1px;pointer-events:none;z-index:1;opacity:0;' +
         'background:conic-gradient(from 180deg,#2163af,#2ea8ae 30%,#d6eaf0 50%,#291c53 75%,#2163af);' +
         '-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;transition:opacity .45s ease}' +
         'body[data-nav="4"] ' + BAR + ':hover::before{opacity:.55}' +
         'body[data-nav="4"] ' + BAR + '::after{content:"";position:absolute;left:8%;right:8%;bottom:-10px;height:18px;border-radius:999px;pointer-events:none;z-index:0;' +
         'background:linear-gradient(90deg,rgba(33,99,175,.0),rgba(46,168,174,.55),rgba(41,28,83,.0));filter:blur(14px);opacity:0;transition:opacity .45s ease}' +
         'body[data-nav="4"] ' + BAR + ':hover::after{opacity:1}' +
         'body[data-nav="4"] ' + LOGO + ' a::after{color:#f1f8fb}' +
         'body[data-nav="4"] ' + LINKS + ' a{color:rgba(214,234,240,.62)!important;font-size:13px!important;font-weight:500!important;letter-spacing:.04em!important;' +
         'padding:9px 13px!important;border-radius:9px!important;position:relative!important}' +
         'body[data-nav="4"] ' + LINKS + ' a:hover{color:#f1f8fb!important;background:rgba(214,234,240,.06)!important}' +
         'body[data-nav="4"] ' + LINKS + ' a[data-framer-page-link-current]{color:#f1f8fb!important}' +
         'body[data-nav="4"] ' + LINKS + ' a[data-framer-page-link-current]::after{content:"";position:absolute;left:13px;right:13px;bottom:3px;height:1px;background:#2ea8ae}' +
         'body[data-nav="4"] ' + RIGHT + '{height:40px!important;padding:0 20px!important;border-radius:999px!important;background:#d6eaf0!important;' +
         'box-shadow:inset 0 1px 0 rgba(255,255,255,.55),0 10px 24px -16px rgba(214,234,240,.5)!important}' +
         'body[data-nav="4"] ' + RIGHT + ' *{color:#08090a!important}' +
         'body[data-nav="4"] ' + RIGHT + ':hover{background:#fff!important}';

  function boot() {
    if (!document.body) return setTimeout(boot, 50);
    document.body.setAttribute('data-nav', N);
    if (!document.getElementById('pv-nav-styles')) {
      var st = document.createElement('style');
      st.id = 'pv-nav-styles';
      st.textContent = css;
      document.head.appendChild(st);
    }
    if (!document.querySelector('.pv-note')) {
      var note = document.createElement('div');
      note.className = 'pv-note';
      note.innerHTML = 'Nav ' + N + ' &middot; eye button kept &middot; <a href="/custom/nav-options.html">all options</a>';
      document.body.appendChild(note);
    }
    document.addEventListener('pointermove', function (e) {
      var btn = document.querySelector('[data-framer-name="Hero CTAs"] > div:nth-child(1) a');
      if (!btn) return;
      var r = btn.getBoundingClientRect();
      var dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      var d = Math.hypot(dx, dy) || 1, max = 7;
      btn.style.setProperty('--ex', (dx / d * max).toFixed(1) + 'px');
      btn.style.setProperty('--ey', (dy / d * max).toFixed(1) + 'px');
    });
  }
  boot();
})();
