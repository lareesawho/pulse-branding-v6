/* React Bits · PixelCard (free / MIT set) — plain-JS port of the pixel shimmer.
   Original source: github.com/DavidHDev/react-bits (src/content/Components/PixelCard). */

function Pixel(canvas, ctx, x, y, color, speed, delay) {
  this.w = canvas.width; this.h = canvas.height; this.ctx = ctx; this.x = x; this.y = y;
  this.color = color; this.speed = (Math.random() * 0.8 + 0.1) * speed; this.size = 0;
  this.sizeStep = Math.random() * 0.4; this.minSize = 0.5; this.maxSizeInt = 2;
  this.maxSize = Math.random() * (this.maxSizeInt - this.minSize) + this.minSize;
  this.delay = delay; this.counter = 0;
  this.counterStep = Math.random() * 4 + (this.w + this.h) * 0.01;
  this.isIdle = false; this.isReverse = false; this.isShimmer = false;
}
Pixel.prototype.draw = function () {
  var off = this.maxSizeInt * 0.5 - this.size * 0.5;
  this.ctx.fillStyle = this.color;
  this.ctx.fillRect(this.x + off, this.y + off, this.size, this.size);
};
Pixel.prototype.appear = function () {
  this.isIdle = false;
  if (this.counter <= this.delay) { this.counter += this.counterStep; return; }
  if (this.size >= this.maxSize) this.isShimmer = true;
  if (this.isShimmer) this.shimmer(); else this.size += this.sizeStep;
  this.draw();
};
Pixel.prototype.disappear = function () {
  this.isShimmer = false; this.counter = 0;
  if (this.size <= 0) { this.isIdle = true; return; } else this.size -= 0.1;
  this.draw();
};
Pixel.prototype.shimmer = function () {
  if (this.size >= this.maxSize) this.isReverse = true;
  else if (this.size <= this.minSize) this.isReverse = false;
  this.size += this.isReverse ? -this.speed : this.speed;
};
function effSpeed(v, reduced) { return reduced ? 0 : Math.min(parseInt(v, 10), 100) * 0.001; }
(function () {
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('.pixel-card').forEach(function (card) {
    var canvas = card.querySelector('canvas');
    var ctx = canvas.getContext('2d');
    var pixels = [], raf = null, prev = performance.now(), gap = 7, speed = 60,
        colors = ['#9fe6f2', '#cfe9ff', '#5fb8c8', '#ffffff'];
    function init() {
      var r = card.getBoundingClientRect();
      var w = Math.floor(r.width), h = Math.floor(r.height);
      canvas.width = w; canvas.height = h;
      pixels = [];
      for (var x = 0; x < w; x += gap) {
        for (var y = 0; y < h; y += gap) {
          var c = colors[Math.floor(Math.random() * colors.length)];
          var dx = x - w / 2, dy = y - h / 2;
          pixels.push(new Pixel(canvas, ctx, x, y, c, effSpeed(speed, reduced),
            reduced ? 0 : Math.sqrt(dx * dx + dy * dy)));
        }
      }
    }
    function animate(name) {
      raf = requestAnimationFrame(function () { animate(name); });
      var now = performance.now(), passed = now - prev, interval = 1000 / 60;
      if (passed < interval) return;
      prev = now - (passed % interval);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      var allIdle = true;
      for (var i = 0; i < pixels.length; i++) {
        pixels[i][name]();
        if (!pixels[i].isIdle) allIdle = false;
      }
      if (allIdle) cancelAnimationFrame(raf);
    }
    function run(name) { cancelAnimationFrame(raf); raf = requestAnimationFrame(function () { animate(name); }); }
    card.addEventListener('mouseenter', function () { init(); run('appear'); });
    card.addEventListener('mouseleave', function () { run('disappear'); });
  });
})();

/* Recordings: each card plays its project's own clip while the card is on screen,
   with the poster still as the fallback and the reduced-motion state (same behaviour
   as the case-study collection's studio clips). */
(function () {
  var clips = [].slice.call(document.querySelectorAll('video.pixel-clip'));
  if (!clips.length) return;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var paused = reduced.matches;
  var state = clips.map(function (el) { return { el: el, visible: false }; });

  function start(s) {
    if (paused || document.hidden || !s.visible) return;
    var p = s.el.play();
    if (p && p.catch) p.catch(function () {});
  }
  function stop(s) { s.el.pause(); s.el.classList.remove('on'); }

  clips.forEach(function (el) {
    el.addEventListener('playing', function () { el.classList.add('on'); });
    el.addEventListener('error', function () { el.pause(); el.classList.remove('on'); });
  });

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      var s = state.filter(function (x) { return x.el === entry.target; })[0];
      if (!s) return;
      s.visible = entry.isIntersecting && entry.intersectionRatio >= 0.5;
      if (s.visible) start(s); else stop(s);
    });
  }, { threshold: [0, 0.5, 0.9] });
  state.forEach(function (s) { observer.observe(s.el); });

  document.addEventListener('visibilitychange', function () {
    state.forEach(function (s) { if (document.hidden) stop(s); else start(s); });
  });
})();
