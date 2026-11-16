// The insight index is a Framer CMS list: six rows are server-rendered, and Framer re-renders that
// list from its hydration table, so a row added to the HTML is dropped within a second of load
// (measured: an inserted probe row was gone, the original rows intact). Articles ported from the old
// site therefore have to be added after hydration — the same pattern /work uses for its cards.
//
// Hydration can also replace the whole list element, which throws away rows appended a moment before
// it, so this does not "add once": it keeps a short watchdog that re-adds any missing ported row and
// stops when the list has been stable for a few ticks. Each added row is marked, so repeats are
// harmless. The last row is cloned (one container per row after hydration) so the new rows inherit
// the real layout, then number, link, thumb, title, category and read time are rewritten; the clone
// also carries the entrance style Framer left behind, which would leave it invisible, so it is shown
// as final state.
(function () {
  var ARTICLES = window.__PULSE_PORTED_INSIGHTS__ || [];
  if (!ARTICLES.length) return;

  function rowsOf(list) {
    return Array.prototype.filter.call(list.children, function (el) {
      return el.nodeType === 1 && !!el.querySelector('a[href^="/insights/"]');
    });
  }

  function pad(n) {
    return n < 10 ? '0' + n : String(n);
  }

  function fill(clone, article, number) {
    var link = clone.querySelector('a[href^="/insights/"]');
    if (link) link.setAttribute('href', '/insights/' + article.slug);
    var num = clone.querySelector('[data-framer-name="Number"] p');
    if (num) num.textContent = number;
    var thumb = clone.querySelector('[data-framer-name="Thumb"] img');
    if (thumb) {
      thumb.setAttribute('src', article.cover + '-1440.webp');
      thumb.setAttribute('srcset', article.cover + '-768.webp 768w,' + article.cover + '-1440.webp 1440w');
      thumb.setAttribute('alt', article.title);
      thumb.setAttribute('width', '1440');
      thumb.setAttribute('height', '960');
    }
    var title = clone.querySelector('[data-framer-name="Title"] h3');
    if (title) title.textContent = article.title;
    var meta = clone.querySelector('[data-framer-name="Meta"]');
    if (meta) {
      var texts = meta.querySelectorAll('p');
      if (texts[0]) texts[0].textContent = article.category;
      if (texts[1]) texts[1].textContent = article.readTime + ' min read';
    }
    var row = clone.querySelector('[data-framer-name="Insight Row"]') || clone;
    row.style.opacity = '1';
    row.style.transform = 'none';
    row.style.willChange = 'auto';
    clone.setAttribute('data-pulse-ported-row', article.slug);
  }

  function ensure() {
    var list = document.querySelector('[data-framer-name="Article List"]');
    if (!list) return false;
    var rows = rowsOf(list);
    if (rows.length < 2) return false;
    var present = {};
    rows.forEach(function (row) {
      var slug = row.getAttribute('data-pulse-ported-row');
      if (slug) present[slug] = true;
    });
    var missing = ARTICLES.filter(function (article) { return !present[article.slug]; });
    if (!missing.length) return true;
    var template = rows[rows.length - 1].cloneNode(true);
    template.removeAttribute('data-pulse-ported-row');
    var lastNumber = parseInt((rows[rows.length - 1].querySelector('[data-framer-name="Number"] p') || {}).textContent || '0', 10) || rows.length;
    missing.forEach(function (article, i) {
      var clone = template.cloneNode(true);
      fill(clone, article, pad(lastNumber + 1 + i));
      list.appendChild(clone);
    });
    return true;
  }

  // Hydration on a live connection landed later than this watchdog's first version expected: the
  // rows were added, the list was re-rendered over 8 s in, and the watchdog had already stopped —
  // the live index showed six rows while the local one showed ten. So the timer now runs the full
  // 30 s (100 ticks) with no early stop, and a MutationObserver re-adds immediately when the list
  // itself changes, which is what the re-render looks like from the DOM.
  var ticks = 0;
  var timer = window.setInterval(function () {
    ticks++;
    ensure();
    if (ticks > 100) window.clearInterval(timer);
  }, 300);

  var list = document.querySelector('[data-framer-name="Article List"]');
  if (list && window.MutationObserver) {
    var observer = new MutationObserver(function () { ensure(); });
    observer.observe(list, { childList: true });
  }
})();
