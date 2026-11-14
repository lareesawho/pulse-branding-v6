/* React Bits islands — content renders immediately; a component is fetched and mounted only
   when its placeholder approaches the viewport. No blocking loader, no build step.

   Usage:  <div class="rb-island" data-rb="BorderGlow" data-rb-props='{"glowColor":"46,168,174"}'></div>
*/
(function () {
  var SRC = (document.currentScript && document.currentScript.src) || '';
  /* A version on the islands script tag versions every component it fetches, so one
     ?v= bump on the script refreshes the whole reactbits set. */
  var VER = (SRC.match(/[?&]v=([^&]+)/) || [])[1] || '';
  var SUFFIX = VER ? '?v=' + VER : '';
  var BASE = SRC.replace(/islands\.js.*$/, '');
  var RUNTIME = ['../vendor/react.production.min.js',
                 '../vendor/react-dom.production.min.js',
                 '../vendor/htm.umd.js'];
  /* Only components that actually ship a stylesheet, so the loader never requests a
     missing file. Regenerate this list when a component gains or loses its CSS. */
  var HAS_CSS = {AuroraBlur:1,BorderGlow:1,CardSwap:1,ChromaWaves:1,GlassSurface:1,HalftoneWave:1,LineSidebar:1,LiquidLines:1,ScrollExpand:1,ShapeBlur:1,Stepper:1,WarpTwister:1};
  var ready = null;
  var failed = [];

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = BASE + src;
      s.async = false;
      s.onload = resolve;
      s.onerror = function () { reject(new Error('could not load ' + src)); };
      document.head.appendChild(s);
    });
  }

  /* Every island needs its own stylesheet. Linking those per page was missed on most
     pages, which left components unstyled (raw bullets, collapsed glow layers), so the
     loader injects the matching CSS itself the moment it sees the island. */
  function ensureCss(name) {
    if (!HAS_CSS[name]) return;
    var href = BASE + name + '.css' + SUFFIX;
    var existing = document.querySelector('link[data-rb-css="' + name + '"]') ||
                   document.querySelector('link[href="' + href + '"]');
    if (existing) return;
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = href;
    l.setAttribute('data-rb-css', name);
    document.head.appendChild(l);
  }

  function runtime() {
    if (!ready) {
      ready = RUNTIME.reduce(function (p, src) { return p.then(function () { return loadScript(src); }); },
                             Promise.resolve())
        .then(function () { window.__rbHtml = window.htm.bind(window.React.createElement); });
    }
    return ready;
  }

  function mount(el) {
    var name = el.getAttribute('data-rb');
    ensureCss(name);
    var props = {};
    try { props = el.getAttribute('data-rb-props') ? JSON.parse(el.getAttribute('data-rb-props')) : {}; }
    catch (e) { console.warn('[reactbits] bad props for ' + name, e); }
    /* Named behaviours: markup can request a built-in handler without inline JS. */
    var handlers = {};
    try { handlers = el.getAttribute('data-rb-handlers') ? JSON.parse(el.getAttribute('data-rb-handlers')) : {}; }
    catch (e) { handlers = {}; }
    Object.keys(handlers).forEach(function (key) {
      if (handlers[key] === 'stepIndicatorLabels') {
        var labels = [];
        try { labels = JSON.parse(el.getAttribute('data-labels') || '[]'); } catch (e) { labels = []; }
        props[key] = function (info) {
          var status = info.currentStep === info.step ? 'active' : info.currentStep < info.step ? 'inactive' : 'complete';
          return window.React.createElement('button', {
            type: 'button',
            className: 'rb-edit-step rb-edit-step--' + status,
            onClick: function () { if (status !== 'active') info.onStepClick(info.step); }
          }, [
            window.React.createElement('span', { className: 'rb-edit-step__num', key: 'n' },
              String(info.step).padStart(2, '0')),
            window.React.createElement('span', { className: 'rb-edit-step__label', key: 'l' },
              labels[info.step - 1] || '')
          ]);
        };
        return;
      }
      if (handlers[key] !== 'scrollToTargets') return;
      var targets = [];
      try { targets = JSON.parse(el.getAttribute('data-targets') || '[]'); } catch (e) { targets = []; }
      props[key] = function (index) {
        var id = targets[index];
        var node = id ? document.getElementById(id) : null;
        if (node) node.scrollIntoView({ behavior: 'smooth', block: 'start' });
      };
    });
    /* createRoot().render() replaces the host's children, so markup that must survive
       (a wrapped button, a panel) is captured first and handed to React as children. */
    var keepChildren = el.getAttribute('data-rb-keep-children');
    var capturedHTML = keepChildren ? el.innerHTML : null;   /* capture before any render */
    el.setAttribute('data-rb-mounted', 'pending');
    runtime()
      .then(function () { return import(BASE + name + '.js' + SUFFIX); })
      .then(function (mod) {
        var Comp = mod.default || mod[name];
        if (!Comp) throw new Error('no default export in ' + name + '.js');
        if (capturedHTML !== null) {
          var splitSel = el.getAttribute('data-rb-children-split');
          var parts = splitSel ? Array.prototype.slice.call(el.querySelectorAll(splitSel)) : null;
          if (parts && parts.length) {
            props.children = parts.map(function (part) {
              var isNode = part.childElementCount > 0;
              return window.React.createElement('div', { className: 'rb-children' + (isNode ? '' : ' rb-children--text'),
                dangerouslySetInnerHTML: { __html: isNode ? part.innerHTML : part.textContent } });
            });
          } else {
            props.children = window.React.createElement('div', {
              className: 'rb-children',
              dangerouslySetInnerHTML: { __html: capturedHTML }
            });
          }
        }
        var root = window.ReactDOM.createRoot(el);
        root.render(window.React.createElement(Comp, props));
        el.setAttribute('data-rb-mounted', 'yes');
      })
      .catch(function (err) {
        failed.push(name);
        el.setAttribute('data-rb-mounted', 'failed');
        console.warn('[reactbits] ' + name + ' did not mount:', err && err.message);
      });
  }

  function scan(root) {
    var nodes = (root || document).querySelectorAll('[data-rb]:not([data-rb-mounted])');
    Array.prototype.forEach.call(nodes, function (el) {
      ensureCss(el.getAttribute('data-rb'));   /* style before the island enters view */
      if (observer) observer.observe(el); else mount(el);
    });
  }

  var observer = ('IntersectionObserver' in window)
    ? new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { observer.unobserve(e.target); mount(e.target); }
        });
      }, { rootMargin: '320px 0px' })
    : null;

  window.reactBits = { scan: scan, mount: mount, failed: function () { return failed.slice(); } };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { scan(); });
  } else {
    scan();
  }
})();
