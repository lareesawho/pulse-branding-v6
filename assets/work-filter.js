/* /work.html — case filter (contract 4.2 item 3) and the editorial-row clips (item 4).
   Loaded by work.html only. Shareable ?filter= destinations are validated against the existing buttons.            */
(function () {
  'use strict';

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ------------------------------------------------------------------ the filter */
  var buttons = [].slice.call(document.querySelectorAll('.work-filter__btn'));
  var status = document.getElementById('work-filter-status');
  var items = [].slice.call(document.querySelectorAll('.work-flagship .pixel-card, .work-row'));
  var labels = {};
  buttons.forEach(function (b) { labels[b.getAttribute('data-filter')] = b.textContent.replace(/\d+\s*$/, '').trim(); });

  function apply(key) {
    if (!Object.prototype.hasOwnProperty.call(labels,key)) key='all';
    buttons.forEach(function(b){b.setAttribute('aria-pressed',String(b.getAttribute('data-filter')===key));});
    document.querySelectorAll('video.work-row__clip').forEach(function(v){v.pause();v.classList.remove('on');});
    var shown = 0;
    items.forEach(function (el) {
      var tags = (el.getAttribute('data-tags') || '').split(/\s+/);
      var on = key === 'all' || tags.indexOf(key) !== -1;
      var target = el.closest('.work-row-item') || el;
      target.hidden = !on;
      if (on) shown++;
    });
    /* a filtered-out clip must not keep playing behind the layout */
    if (!key) return;
    /* No counts anywhere on this site (Lareesa, 2026-10-04): the status names the
       filter that is on, it never states how many collaborations exist. */
    if (status) {
      status.textContent = shown
        ? (key === 'all' ? 'Showing every collaboration.' : 'Showing ' + labels[key] + ' work.')
        : 'No published collaboration is tagged ' + labels[key] + ' yet.';
    }
  }

  buttons.forEach(function (b) {
    b.addEventListener('click', function () {
      buttons.forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
      var key=b.getAttribute('data-filter');
      apply(key);
      var url=new URL(location.href);
      if(key==='all')url.searchParams.delete('filter');else url.searchParams.set('filter',key);
      history.replaceState(null,'',url.href);
    });
  });

  /* Roving arrow keys inside the group, so the whole filter is usable by keyboard alone. */
  var row = document.querySelector('.work-filter__row');
  if (row) {
    row.addEventListener('keydown', function (e) {
      var i = buttons.indexOf(document.activeElement);
      if (i === -1) return;
      var next = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : -1;
      if (e.key!=='ArrowRight'&&e.key!=='ArrowLeft') return;
      e.preventDefault();
      buttons[(next + buttons.length) % buttons.length].focus();
    });
  }

  /* --------------------------------------------------------- editorial-row clips */
  /* Contract: touch and reduced-motion views are static, and only the visible row plays.
     Nothing is loaded until a row is both on screen and hovered/focused.               */
  if (!(reduced && reduced.matches) && matchMedia('(hover:hover)').matches) {
    var rows = [].slice.call(document.querySelectorAll('video.work-row__clip'));
    rows.forEach(function (v) {
      var onScreen = false;
      var wanted = false;
      var host = v.closest('.work-row');

      function sync() {
        if (wanted && onScreen && !document.hidden && !v.hidden && !host.closest('[hidden]')) {
          var p = v.play();
          if (p && p.catch) p.catch(function () {});
        } else {
          v.pause();
          v.classList.remove('on');
        }
      }
      v.addEventListener('playing', function () { v.classList.add('on'); });
      v.addEventListener('error', function () { v.pause(); v.classList.remove('on'); });

      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { onScreen = e.isIntersecting && e.intersectionRatio >= 0.4; });
        sync();
      }, { threshold: [0, 0.4, 0.9] }).observe(v);

      if (host) {
        host.addEventListener('mouseenter', function () { wanted = true; sync(); });
        host.addEventListener('mouseleave', function () { wanted = false; sync(); });
        host.addEventListener('focusin', function () { wanted = true; sync(); });
        host.addEventListener('focusout', function () { wanted = false; sync(); });
      }
    });
    document.addEventListener('visibilitychange', function () {
      document.querySelectorAll('video.work-row__clip').forEach(function (v) {
        if (document.hidden) { v.pause(); v.classList.remove('on'); }
      });
    });
  }

  function fromURL(){apply(new URL(location.href).searchParams.get('filter')||'all');}
  window.addEventListener('popstate',fromURL);
  fromURL();
})();
