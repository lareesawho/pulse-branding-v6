// The home page's stats and its "Est. …" line are painted by Framer's runtime from data in
// the hydrated chunks (site/sites/…/*.mjs), so the corrected facts written into the HTML are
// overwritten when the page hydrates. This re-applies the studio's real numbers after paint:
// the counter labels are matched (not the values), so the animated numbers land on the true
// figures, and any "Est. 2018" text node becomes "Est. 2019".
(function () {
  var STATS = {
    'projects delivered': '270+',
    'countries reached': '18',
    'brands launched': '27',
    'years of experience': '07'
  };

  function fixStats() {
    var stats = document.querySelectorAll('[data-framer-name="Stat"]');
    for (var i = 0; i < stats.length; i++) {
      var stat = stats[i];
      var label = stat.querySelector('[data-framer-name="Label"]');
      var value = stat.querySelector('[data-framer-name="Value"]');
      if (!label || !value) continue;
      var want = STATS[label.textContent.trim().toLowerCase()];
      if (!want) continue;
      var p = value.querySelector('p') || value;
      if (p.textContent.trim() !== want) p.textContent = want;
    }
  }

  function fixEst() {
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    var node;
    while ((node = walker.nextNode())) {
      if (node.nodeValue.indexOf('Est. 2018') === -1) continue;
      node.nodeValue = node.nodeValue.replace('Est. 2018', 'Est. 2019');
    }
  }

  function pass() {
    fixStats();
    fixEst();
  }

  var ticks = 0;
  var timer = window.setInterval(function () {
    ticks++;
    pass();
    if (ticks > 75) window.clearInterval(timer); // 30 s at 400 ms: hydration and its counter settle
  }, 400);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', pass, { once: true });
  } else {
    pass();
  }
})();
