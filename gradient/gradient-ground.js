/**
 * THE ground — pulse-branding.com's Webflow hero, mounted by ratio.
 *
 *   <div class="pg" data-ratio="16/9"></div>
 *   <script src="/gradient/gradient-ground.js" defer></script>
 *
 * Loaded as a classic script, it mounts every .pg on the page itself.
 *
 * Attributes on the host:
 *   data-ratio    16/9 | 1.32 | 1/1 | 4/5 | 21/9 | fill   (fill = 100% of the parent box)
 *   data-opacity  group opacity, default 1
 *   data-paused   "true" holds the shapes still
 *   data-veil     "true" lays the atmosphere on paper for a light section
 *
 * No WebGL, no React, no shader: the ground is nine CSS shapes in two blur
 * groups, which is what the live site actually renders. That removes the
 * failure path the old GlowingRidges build needed a fallback for — if this
 * script never runs, the mark-up written by hand in the page still shows.
 */
const GROUPS = [
  ['', ['s3', 's2', 's1']],
  [' pg__group--blend', ['s8', 's9', 's4', 's5', 's7', 's6']],
];

function shapes() {
  return GROUPS.map(([extra, names]) =>
    '<span class="pg__group' + extra + '">' +
    names.map((n) => '<i class="pg__s ' + n + '"></i>').join('') +
    '</span>').join('') + '<span class="pg__noise"></span>';
}

function mountGround(hosts) {
  (hosts || []).forEach((host) => {
    if (host.dataset.pgMounted) return;
    host.dataset.pgMounted = 'yes';

    if (host.getAttribute('data-veil') === 'true') host.classList.add('pg--veil');

    /* hand-written shapes win: only fill an empty frame */
    if (!host.querySelector('.pg__group')) host.insertAdjacentHTML('afterbegin', shapes());

    const opacity = host.getAttribute('data-opacity');
    if (opacity) host.querySelectorAll('.pg__group').forEach((g) => { g.style.opacity = opacity; });
  });
}

window.mountGround = mountGround;

/* every page that carries a .pg gets its ground without an inline call */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => mountGround(document.querySelectorAll('.pg')));
} else {
  mountGround(document.querySelectorAll('.pg'));
}
