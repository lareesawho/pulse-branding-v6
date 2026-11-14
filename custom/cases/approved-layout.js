/* ============================================================================
   Case page = the approved page's own structure, ported verbatim.

   Between the template's glass nav and its bottom links + footer, the body is
   the article from test.pulse-branding.com/portfolio-collection/<case>.html —
   same markup, same copy, its own stylesheet. Nothing is re-drawn here.

   The template's own case body is hidden, because Framer re-renders it after
   hydration and would otherwise sit underneath the article.
   ========================================================================== */
(function () {
  'use strict';

  var C = window.__PULSE_CASE__;
  if (!C || !C.slug) return;

  var SLUG = C.slug;
  var ARTICLE = '/custom/cases/' + SLUG + '-article.html';
  var CSS = '/case-assets/approved.css';
  var ID = 'pulse-approved-case';

  /* the approved page is a light article: give it its own ground so the clone's
     dark body does not swallow its type */
  function ensureGround() {
    if (document.getElementById('pulse-case-ground')) return;
    var st = document.createElement('style');
    st.id = 'pulse-case-ground';
    st.textContent = '#pulse-approved-case{background:#f5f5f3;color:#111;width:100%;padding:0 0 40px}'
      + '#pulse-approved-case main{max-width:1240px;margin:0 auto;padding:0 40px}+#pulse-approved-case .case-static,#pulse-approved-case article{max-width:100%;margin:0}'
      + '#pulse-approved-case h1,#pulse-approved-case h2,#pulse-approved-case h3,#pulse-approved-case p,#pulse-approved-case li,#pulse-approved-case a{color:inherit}'
      + '@media(max-width:820px){#pulse-approved-case main,#pulse-approved-case .wrap,#pulse-approved-case .container{padding-left:20px;padding-right:20px}}';
    document.head.appendChild(st);
  }

  function ensureCss() {
    if (document.querySelector('link[data-pulse-case-css]')) return;
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = CSS;
    l.setAttribute('data-pulse-case-css', '');
    document.head.appendChild(l);
  }

  function hideTemplateBody() {
    var nav = document.querySelector('[data-framer-name="Navigation"]');
    var footer = document.querySelector('footer') || document.querySelector('[data-framer-name="Footer"]');
    if (!footer) return null;
    var node = footer.previousElementSibling;
    while (node && node !== nav) {
      if (node.id !== ID) {
        node.dataset.pulseHidden = '1';
        node.style.setProperty('display', 'none', 'important');
      }
      node = node.previousElementSibling;
    }
    return footer;
  }

  function mount(html) {
    var footer = hideTemplateBody();
    if (!footer) return false;

    var wrap = document.createElement('div');
    wrap.id = ID;
    wrap.className = 'pulse-approved';
    wrap.innerHTML = html;

    /* the ported markup points at ../wekwikgene-case-study/assets/… — serve it from the site root */
    wrap.querySelectorAll('img[src]').forEach(function (img) {
      var s = img.getAttribute('src') || '';
      var i = s.indexOf('wekwikgene-case-study/');
      if (i > -1) img.setAttribute('src', '/' + s.slice(i));
    });

    footer.parentNode.insertBefore(wrap, footer);
    return true;
  }

  var loading = false;

  function run() {
    if (document.getElementById(ID) || loading) return;
    loading = true;
    fetch(ARTICLE, { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.text() : Promise.reject(new Error(r.status)); })
      .then(function (html) {
        ensureCss();
        ensureGround();
        loading = !mount(html);           /* footer not mounted yet → retry next tick */
      })
      .catch(function () { loading = false; });
  }

  /* Framer mounts late and re-renders once: keep asserting until it sticks */
  setInterval(function () { if (!document.getElementById(ID)) run(); }, 600);
  run();
})();
