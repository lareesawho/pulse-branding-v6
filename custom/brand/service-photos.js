// The home page's "What we do" panels load the ORENZA template's stock photography from a
// Framer chunk (site/sites/.../FoomQmPR…mjs): the markup holds no reference to those files and
// the chunk is served immutable, so the six pictures have to be replaced in the page. The
// studio's own service images (the ones /services already uses) are the right pictures for
// the same six services.
//
// The runtime hydrates the panels after first paint — sometimes seconds after — so this polls
// instead of trusting a single DOMContentLoaded pass. Every swap marks the image, which makes
// the loop idempotent and harmless to run often.
(function () {
  var STOCK = [
    ['1Y0xHaDreQIE0Dw0sISf0dsYFAg', 'brand-strategy'],
    ['IB19ZTW9QiSJ0dyE3lYjTIUcAg', 'visual-identity'],
    ['DHkPWe0WPdaLFapkajOKpHZElI', 'digital-design'],
    ['QmizIZc8uvoItm716YlsAbWADdI', 'creative-development'],
    ['hEH9ye9A9IMExTCK6ZuCBVRe8g', 'campaigns-content']
  ];

  function slugFor(value) {
    for (var i = 0; i < STOCK.length; i++) {
      if (value.indexOf(STOCK[i][0]) !== -1) return STOCK[i][1];
    }
    return null;
  }

  function pass() {
    var list = document.querySelectorAll('[data-framer-name="Services"] img');
    var changed = 0;
    for (var i = 0; i < list.length; i++) {
      var img = list[i];
      if (img.getAttribute('data-pulse-service')) continue;
      var slug = slugFor((img.getAttribute('src') || '') + ' ' + (img.getAttribute('srcset') || ''));
      if (!slug) continue;
      var base = '/images/services/' + slug;
      img.setAttribute('data-pulse-service', slug);
      img.setAttribute('srcset', base + '-512.webp 512w, ' + base + '-768.webp 768w, ' + base + '-1080.webp 1080w');
      img.setAttribute('src', base + '-768.webp');
      img.removeAttribute('sizes');
      changed++;
    }
    return changed;
  }

  var ticks = 0;
  var timer = window.setInterval(function () {
    ticks++;
    pass();
    if (ticks > 100) window.clearInterval(timer); // ~30 s at 300 ms: hydration has happened or never will
  }, 300);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', pass, { once: true });
  } else {
    pass();
  }
})();
