/* Chosen animated covers — Lareesa's picks, 27 Sep 2026.
   A card keeps its still cover; the picked motion cover replaces it only while the card is hovered,
   so one screen is visible at a time. The video is created on first hover, so the page loads nothing
   until it is wanted. Skipped entirely for reduced-motion visitors and touch devices. */
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.matchMedia('(hover: hover)').matches) return;
  document.querySelectorAll('[data-cover-motion]').forEach(function (card) {
    var src = card.getAttribute('data-cover-motion');
    var stage = card.querySelector('.studio-stage');
    var video = null;
    card.addEventListener('pointerenter', function () {
      if (!video) {
        video = document.createElement('video');
        video.className = 'cover-motion';
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        video.setAttribute('aria-hidden', 'true');
        video.tabIndex = -1;
        video.src = src;
        if (stage) { stage.appendChild(video); } else { card.insertBefore(video, card.firstChild); }
      }
      var p = video.play();
      if (p && p.catch) p.catch(function () {});
    });
    card.addEventListener('pointerleave', function () { if (video) video.pause(); });
  });
})();
